/**
 * TORNEO DE AJEDREZ - APLICACIÓN PRINCIPAL
 * Sistema de gestión con tarjetas dinámicas
 */

import { ref, onValue, push, set, remove, get } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

// ============================================
// VARIABLES GLOBALES
// ============================================
const db = window.firebaseDatabase;
let playersData = [];
let pairingsData = [];
let currentRound = 1;

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 Aplicación iniciada');
    initializeApp();
});

function initializeApp() {
    // Cargar datos en tiempo real
    loadPlayers();
    loadPairings();
    loadTournamentInfo();
}

// ============================================
// CARGAR INFORMACIÓN DEL TORNEO
// ============================================
function loadTournamentInfo() {
    const tournamentRef = ref(db, 'tournament');
    
    onValue(tournamentRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            currentRound = data.currentRound || 1;
            updateTournamentStats();
        }
    });
}

function updateTournamentStats() {
    document.getElementById('total-players').textContent = playersData.length;
    document.getElementById('current-round').textContent = currentRound;
    document.getElementById('total-games').textContent = pairingsData.length;
}

// ============================================
// CARGAR JUGADORES
// ============================================
function loadPlayers() {
    const playersRef = ref(db, 'players');
    
    onValue(playersRef, (snapshot) => {
        const data = snapshot.val();
        playersData = [];
        
        if (data) {
            Object.keys(data).forEach(key => {
                playersData.push({
                    id: key,
                    ...data[key]
                });
            });
            
            // Ordenar por puntos y rating
            playersData.sort((a, b) => {
                if (b.points !== a.points) {
                    return b.points - a.points;
                }
                return b.rating - a.rating;
            });
        }
        
        renderPlayers();
        updateTournamentStats();
    }, (error) => {
        console.error('Error al cargar jugadores:', error);
        showError('No se pudieron cargar los jugadores');
    });
}

// ============================================
// RENDERIZAR JUGADORES (TARJETAS)
// ============================================
function renderPlayers() {
    const container = document.getElementById('players-container');
    
    if (!playersData || playersData.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <i class="fas fa-users-slash"></i>
                </div>
                <h3 class="empty-state-title">No hay jugadores registrados</h3>
                <p class="empty-state-text">Los jugadores aparecerán aquí una vez que sean agregados al torneo.</p>
            </div>
        `;
        return;
    }
    
    let html = '<ul class="cards-grid">';
    
    playersData.forEach((player, index) => {
        const rank = index + 1;
        const rankClass = rank <= 3 ? `top-3 rank-${rank}` : '';
        const whatsappNumber = player.whatsapp || '';
        const whatsappFormatted = whatsappNumber.replace(/\s+/g, '');
        
        html += `
            <li class="card player-card">
                <div class="player-rank ${rankClass}">
                    ${rank}
                </div>
                
                <div class="player-info">
                    <h3 class="player-name">${escapeHtml(player.name)}</h3>
                    <div class="player-details">
                        <span class="player-detail">
                            <i class="detail-icon fas fa-star"></i>
                            <strong>${player.rating || 0}</strong> ELO
                        </span>
                        <span class="player-detail">
                            <i class="detail-icon fas fa-trophy"></i>
                            <strong>${player.points || 0}</strong> puntos
                        </span>
                        <span class="player-detail">
                            <i class="detail-icon fas fa-chess"></i>
                            <strong>${player.games || 0}</strong> partidas
                        </span>
                    </div>
                </div>
                
                <div class="player-actions">
                    ${whatsappFormatted ? `
                        <a href="https://wa.me/${whatsappFormatted}" 
                           target="_blank" 
                           rel="noopener noreferrer"
                           class="btn-whatsapp"
                           title="Contactar por WhatsApp">
                            <i class="fab fa-whatsapp"></i>
                            Contactar
                        </a>
                    ` : ''}
                </div>
            </li>
        `;
    });
    
    html += '</ul>';
    container.innerHTML = html;
}

// ============================================
// CARGAR PAREOS
// ============================================
function loadPairings() {
    const pairingsRef = ref(db, 'pairings');
    
    onValue(pairingsRef, (snapshot) => {
        const data = snapshot.val();
        pairingsData = [];
        
        if (data) {
            Object.keys(data).forEach(key => {
                pairingsData.push({
                    id: key,
                    ...data[key]
                });
            });
            
            // Ordenar por ronda (más reciente primero)
            pairingsData.sort((a, b) => b.round - a.round);
        }
        
        renderPairings();
        updateTournamentStats();
    }, (error) => {
        console.error('Error al cargar pareos:', error);
        showError('No se pudieron cargar los pareos');
    });
}

// ============================================
// RENDERIZAR PAREOS (TARJETAS)
// ============================================
function renderPairings() {
    const container = document.getElementById('pairings-container');
    
    if (!pairingsData || pairingsData.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <i class="fas fa-chess-board"></i>
                </div>
                <h3 class="empty-state-title">No hay pareos programados</h3>
                <p class="empty-state-text">Los enfrentamientos aparecerán aquí cuando se generen los pareos de cada ronda.</p>
            </div>
        `;
        return;
    }
    
    let html = '<ul class="cards-grid">';
    
    pairingsData.forEach(pairing => {
        const whitePlayer = findPlayerById(pairing.whitePlayerId);
        const blackPlayer = findPlayerById(pairing.blackPlayerId);
        
        if (!whitePlayer || !blackPlayer) return;
        
        const result = pairing.result || 'pending';
        const resultText = getResultText(result);
        const resultClass = result === 'pending' ? 'pending' : 'completed';
        const date = pairing.date || 'Fecha por confirmar';
        
        html += `
            <li class="card pairing-card">
                <div class="pairing-header">
                    <div class="pairing-round">
                        <i class="fas fa-layer-group"></i>
                        Ronda ${pairing.round}
                    </div>
                    <div class="pairing-date">
                        <i class="far fa-calendar"></i>
                        ${escapeHtml(date)}
                    </div>
                </div>
                
                <div class="pairing-match">
                    <div class="pairing-player white">
                        <div class="pairing-player-name">
                            <i class="fas fa-chess-pawn" style="color: #e8eaed;"></i>
                            ${escapeHtml(whitePlayer.name)}
                        </div>
                        <div class="pairing-player-rating">
                            ${whitePlayer.rating} ELO
                        </div>
                    </div>
                    
                    <div class="pairing-vs">VS</div>
                    
                    <div class="pairing-player black">
                        <div class="pairing-player-name">
                            ${escapeHtml(blackPlayer.name)}
                            <i class="fas fa-chess-pawn" style="color: #5f6368;"></i>
                        </div>
                        <div class="pairing-player-rating">
                            ${blackPlayer.rating} ELO
                        </div>
                    </div>
                </div>
                
                <div class="pairing-result">
                    <span class="result-badge ${resultClass}">
                        ${resultText}
                    </span>
                </div>
            </li>
        `;
    });
    
    html += '</ul>';
    container.innerHTML = html;
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================
function findPlayerById(playerId) {
    return playersData.find(p => p.id === playerId);
}

function getResultText(result) {
    const results = {
        'pending': 'Por Jugar',
        'white': 'Victoria Blancas',
        'black': 'Victoria Negras',
        'draw': 'Tablas'
    };
    return results[result] || 'Pendiente';
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

function showError(message) {
    console.error(message);
    // Puedes implementar un sistema de notificaciones aquí
}

// ============================================
// FUNCIONES DE ADMINISTRACIÓN (para admin.js)
// ============================================

// Agregar jugador
export async function addPlayer(name, rating, whatsapp = '') {
    try {
        const playersRef = ref(db, 'players');
        const newPlayerRef = push(playersRef);
        
        await set(newPlayerRef, {
            name: name.trim(),
            rating: parseInt(rating),
            whatsapp: whatsapp.trim(),
            points: 0,
            games: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            createdAt: Date.now()
        });
        
        return { success: true, message: 'Jugador agregado correctamente' };
    } catch (error) {
        console.error('Error al agregar jugador:', error);
        return { success: false, message: 'Error al agregar jugador' };
    }
}

// Eliminar jugador
export async function deletePlayer(playerId) {
    try {
        const playerRef = ref(db, `players/${playerId}`);
        await remove(playerRef);
        return { success: true, message: 'Jugador eliminado correctamente' };
    } catch (error) {
        console.error('Error al eliminar jugador:', error);
        return { success: false, message: 'Error al eliminar jugador' };
    }
}

// Crear pareo
export async function createPairing(whitePlayerId, blackPlayerId, round, date = '') {
    try {
        const pairingsRef = ref(db, 'pairings');
        const newPairingRef = push(pairingsRef);
        
        await set(newPairingRef, {
            whitePlayerId,
            blackPlayerId,
            round: parseInt(round),
            date: date || new Date().toLocaleDateString('es-ES'),
            result: 'pending',
            createdAt: Date.now()
        });
        
        return { success: true, message: 'Pareo creado correctamente' };
    } catch (error) {
        console.error('Error al crear pareo:', error);
        return { success: false, message: 'Error al crear pareo' };
    }
}

// Generar pareos automáticos (Sistema Suizo simplificado)
export async function generatePairings(round) {
    try {
        // Obtener jugadores actuales
        const playersSnapshot = await get(ref(db, 'players'));
        const players = [];
        
        if (playersSnapshot.exists()) {
            const data = playersSnapshot.val();
            Object.keys(data).forEach(key => {
                players.push({ id: key, ...data[key] });
            });
        }
        
        if (players.length < 2) {
            return { success: false, message: 'Se necesitan al menos 2 jugadores' };
        }
        
        // Ordenar por puntos y rating
        players.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            return b.rating - a.rating;
        });
        
        // Crear pareos
        const pairingsRef = ref(db, 'pairings');
        
        for (let i = 0; i < players.length - 1; i += 2) {
            const newPairingRef = push(pairingsRef);
            await set(newPairingRef, {
                whitePlayerId: players[i].id,
                blackPlayerId: players[i + 1].id,
                round: parseInt(round),
                date: new Date().toLocaleDateString('es-ES'),
                result: 'pending',
                createdAt: Date.now()
            });
        }
        
        // Actualizar ronda actual
        await set(ref(db, 'tournament/currentRound'), parseInt(round));
        
        return { success: true, message: 'Pareos generados correctamente' };
    } catch (error) {
        console.error('Error al generar pareos:', error);
        return { success: false, message: 'Error al generar pareos' };
    }
}

// Actualizar resultado de partida
export async function updatePairingResult(pairingId, result) {
    try {
        const pairingRef = ref(db, `pairings/${pairingId}`);
        await set(pairingRef, { result });
        
        // Aquí puedes actualizar los puntos de los jugadores según el resultado
        
        return { success: true, message: 'Resultado actualizado' };
    } catch (error) {
        console.error('Error al actualizar resultado:', error);
        return { success: false, message: 'Error al actualizar resultado' };
    }
}

// Reiniciar torneo
export async function resetTournament() {
    try {
        await remove(ref(db, 'players'));
        await remove(ref(db, 'pairings'));
        await set(ref(db, 'tournament'), { currentRound: 1 });
        return { success: true, message: 'Torneo reiniciado' };
    } catch (error) {
        console.error('Error al reiniciar torneo:', error);
        return { success: false, message: 'Error al reiniciar torneo' };
    }
}

// Hacer las funciones disponibles globalmente
window.tournamentApp = {
    addPlayer,
    deletePlayer,
    createPairing,
    generatePairings,
    updatePairingResult,
    resetTournament
};