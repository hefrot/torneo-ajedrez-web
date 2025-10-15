const fixturesContainer = document.getElementById('fixtures-container');
const playersRef = database.ref('players');

playersRef.on('value', (snapshot) => {
    const playersData = snapshot.val();

    if (playersData) {
        fixturesContainer.innerHTML = ''; 
        const header = document.createElement('h2');
        header.textContent = 'Jugadores:';
        fixturesContainer.appendChild(header);
        
        const ul = document.createElement('ul');
        const playersList = Object.values(playersData);
        playersList.forEach(player => {
            const li = document.createElement('li');
            li.textContent = ${player.name} (ELO: ) - Lichess: ;
            ul.appendChild(li);
        });
        fixturesContainer.appendChild(ul);
    } else {
        fixturesContainer.innerHTML = '<p>Aún no hay jugadores importados. ¡Vuelve pronto!</p>';
    }
});
