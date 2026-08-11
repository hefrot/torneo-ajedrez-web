import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateSeries,
  generateGameSlots,
  computeStandings,
  seasonPlan,
  dailyPace,
  activityStatus,
  eligibleOpponents,
  seedPlayoffs,
  seedPlayoffTiers,
  noAutomaticForfeitPolicy,
} from '../src/league-engine.js';

const players4 = [
  { id: 'A', name: 'Ana' },
  { id: 'B', name: 'Beto' },
  { id: 'C', name: 'Caro' },
  { id: 'D', name: 'Dani' },
];

const standings = count => Array.from({ length: count }, (_, index) => ({
  id: `P${index + 1}`,
  name: `Player ${index + 1}`,
  rank: index + 1,
}));

test('round robin creates every unique pair once and 3 game slots per pair', () => {
  const series = generateSeries(players4, 3);
  assert.equal(series.length, 6);
  assert.equal(generateGameSlots(series).length, 18);
  assert.equal(new Set(series.map(item => [item.player1Id, item.player2Id].sort().join(':'))).size, 6);
});

test('standings use 3/1/0 and validated games only', () => {
  const games = [
    { player1Id: 'A', player2Id: 'B', result: '1-0', status: 'VALIDATED' },
    { player1Id: 'A', player2Id: 'C', result: '1/2-1/2', status: 'VALIDATED' },
    { player1Id: 'D', player2Id: 'A', result: '1-0', status: 'PENDING' },
  ];
  const table = computeStandings(players4, games);
  const ana = table.find(row => row.id === 'A');
  assert.equal(ana.points, 4);
  assert.equal(ana.played, 2);
  assert.equal(ana.wins, 1);
  assert.equal(ana.draws, 1);
});

test('10-player example remains valid but is not a system limit', () => {
  const plan = seasonPlan(10, 3, 10);
  assert.deepEqual(plan, {
    playerCount: 10,
    opponentsPerPlayer: 9,
    series: 45,
    totalGames: 135,
    gamesPerPlayer: 27,
    targetSeriesDays: 9,
    maxDays: 10,
    graceDays: 1,
    recommendedSeriesPerPlayerPerDay: 1,
    recommendedGamesPerPlayerPerDay: 3,
  });
  assert.equal(dailyPace(27, 10), 3);
});

test('20 players scale to 190 series and 570 official games', () => {
  const plan = seasonPlan(20, 3, 20);
  assert.deepEqual(plan, {
    playerCount: 20,
    opponentsPerPlayer: 19,
    series: 190,
    totalGames: 570,
    gamesPerPlayer: 57,
    targetSeriesDays: 19,
    maxDays: 20,
    graceDays: 1,
    recommendedSeriesPerPlayerPerDay: 1,
    recommendedGamesPerPlayerPerDay: 3,
  });
});

test('32 players scale to 496 series, 1488 games and 31 opponent series per player', () => {
  const plan = seasonPlan(32, 3, 32);
  assert.equal(plan.opponentsPerPlayer, 31);
  assert.equal(plan.series, 496);
  assert.equal(plan.totalGames, 1488);
  assert.equal(plan.gamesPerPlayer, 93);
  assert.equal(plan.targetSeriesDays, 31);
  assert.equal(plan.graceDays, 1);
  assert.equal(plan.recommendedSeriesPerPlayerPerDay, 1);
  assert.equal(plan.recommendedGamesPerPlayerPerDay, 3);
});

test('play-ahead exposes every incomplete opponent, not a fixed round', () => {
  const series = generateSeries(players4, 3);
  series[0].status = 'COMPLETE';
  series[0].gamesPlayed = 3;
  const options = eligibleOpponents('A', series);
  assert.equal(options.length, 2);
  assert.ok(options.every(option => option.gamesRemaining === 3));
});

test('24-hour activity rule warns but does not auto-forfeit', () => {
  const now = new Date('2026-08-10T12:00:00Z');
  assert.equal(activityStatus('2026-08-09T18:30:00Z', now).status, 'OK');
  assert.equal(activityStatus('2026-08-09T17:30:00Z', now).status, 'REMINDER');
  assert.equal(activityStatus('2026-08-09T12:00:00Z', now).status, 'OVERDUE');
  assert.equal(noAutomaticForfeitPolicy().automaticForfeitAfter24h, false);
});

test('16 players create top-8 Championship and ranks 9-16 Challenger', () => {
  const bracket = seedPlayoffs(standings(16));
  assert.equal(bracket.main.bracketSize, 8);
  assert.equal(bracket.main.matches.length, 4);
  assert.equal(bracket.secondary.bracketSize, 8);
  assert.equal(bracket.tiers.length, 2);
  assert.equal(bracket.tiers[0].rankStart, 1);
  assert.equal(bracket.tiers[1].rankStart, 9);
});

test('20 players create Championship, Challenger and a four-player Division 3', () => {
  const tiers = seedPlayoffTiers(standings(20));
  assert.equal(tiers.length, 3);
  assert.deepEqual(tiers.map(tier => [tier.rankStart, tier.rankEnd, tier.status]), [
    [1, 8, 'BRACKET'],
    [9, 16, 'BRACKET'],
    [17, 20, 'BRACKET'],
  ]);
  assert.equal(tiers[2].bracket.bracketSize, 4);
});

test('24 and 32 players create one eight-player postseason tier per ranking block', () => {
  const tiers24 = seedPlayoffTiers(standings(24));
  assert.equal(tiers24.length, 3);
  assert.ok(tiers24.every(tier => tier.bracket?.bracketSize === 8));

  const tiers32 = seedPlayoffTiers(standings(32));
  assert.equal(tiers32.length, 4);
  assert.ok(tiers32.every(tier => tier.bracket?.bracketSize === 8));
});

test('one to three leftover players are preserved as placement-only instead of forcing a bad bracket', () => {
  const tiers = seedPlayoffTiers(standings(18));
  assert.equal(tiers.length, 3);
  assert.equal(tiers[2].rankStart, 17);
  assert.equal(tiers[2].rankEnd, 18);
  assert.equal(tiers[2].status, 'PLACEMENT_ONLY');
  assert.equal(tiers[2].bracket, null);
});
