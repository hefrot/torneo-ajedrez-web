// app.js
const fixturesContainer = document.getElementById('fixtures-container');
const playersRef = database.ref('players');

playersRef.on('value', (snapshot) => {
    const playersData = snapshot.val();

    if (playersData) {
        fixturesContainer.innerHTML = '';

        // Sección de Lista de Jugadores
        const playersHeader = document.createElement('h2');
        playersHeader.textContent = 'Lista de Jugadores Registrados';
        fixturesContainer.appendChild(playersHeader);

        const playersUl = document.createElement('ul');
        const playersList = Object.values(playersData);
        playersList.forEach(player => {
            const li = document.createElement('li');
            li.textContent = `${player.name} (ELO: ${player.elo}) - Lichess: ${player.lichess}`;
            playersUl.appendChild(li);
        });
        fixturesContainer.appendChild(playersUl);

        // Generar Pareos para la Primera Ronda
        const pairingsHeader = document.createElement('h2');
        pairingsHeader.textContent = 'Pareos de la Primera Ronda';
        fixturesContainer.appendChild(pairingsHeader);

        // Mezclar jugadores aleatoriamente
        const shuffledPlayers = [...playersList].sort(() => Math.random() - 0.5);

        const pairingsUl = document.createElement('ul');
        for (let i = 0; i < shuffledPlayers.length; i += 2) {
            const playerA = shuffledPlayers[i];
            const playerB = shuffledPlayers[i + 1] || { name: 'BYE', elo: '-', lichess: '-' }; // Si número impar, último con BYE
            const li = document.createElement('li');
            li.textContent = `${playerA.name} (ELO: ${playerA.elo}) vs ${playerB.name} (ELO: ${playerB.elo})`;
            pairingsUl.appendChild(li);
        }
        fixturesContainer.appendChild(pairingsUl);
    } else {
        fixturesContainer.innerHTML = '<p>Cargando jugadores...</p>';
    }
});
