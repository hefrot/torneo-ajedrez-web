const fixturesContainer = document.getElementById('fixtures-container');
const playersRef = database.ref('players');

playersRef.on('value', (snapshot) => {
    const playersData = snapshot.val();

    if (playersData) {
        fixturesContainer.innerHTML = '';

        const playersList = Object.values(playersData);

        // Sección de Lista de Jugadores
        const playersHeader = document.createElement('h2');
        playersHeader.textContent = 'Lista de Jugadores';
        fixturesContainer.appendChild(playersHeader);

        const playersUl = document.createElement('ul');
        playersList.forEach(player => {
            const li = document.createElement('li');
            // CAMBIO IMPORTANTE: Usamos innerHTML para añadir íconos y un enlace
            li.innerHTML = `
                <span><i class="fas fa-user"></i> ${player.name}</span>
                <span><i class="fas fa-chess-pawn"></i> ELO: ${player.elo}</span>
                <a href="https://lichess.org/@/${player.lichess}" target="_blank">
                    <i class="fa-brands fa-lichess"></i> ${player.lichess}
                </a>
            `;
            playersUl.appendChild(li);
        });
        fixturesContainer.appendChild(playersUl);

        // Sección de Pareos de la Primera Ronda
        const pairingsHeader = document.createElement('h2');
        pairingsHeader.textContent = 'Pareos de la Primera Ronda';
        fixturesContainer.appendChild(pairingsHeader);

        const shuffledPlayers = [...playersList].sort(() => Math.random() - 0.5);

        const pairingsUl = document.createElement('ul');
        for (let i = 0; i < shuffledPlayers.length; i += 2) {
            const playerA = shuffledPlayers[i];
            const playerB = shuffledPlayers[i + 1] || { name: 'BYE' };
            const li = document.createElement('li');
            li.innerHTML = `
                <span><i class="fas fa-chess-king"></i> ${playerA.name}</span>
                <span>vs</span>
                <span><i class="fas fa-chess-queen"></i> ${playerB.name}</span>
            `;
            pairingsUl.appendChild(li);
        }
        fixturesContainer.appendChild(pairingsUl);
    } else {
        fixturesContainer.innerHTML = '<p>Cargando jugadores...</p>';
    }
});
