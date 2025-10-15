const fixturesContainer = document.getElementById('fixtures-container');
const playersRef = database.ref('players');

playersRef.on('value', (snapshot) => {
    fixturesContainer.innerHTML = 'Cargando jugadores...';
    const playersData = snapshot.val();

    if (playersData) {
        const playersList = Object.values(playersData);
        fixturesContainer.innerHTML = ''; 

        const header = document.createElement('h2');
        header.textContent = 'Lista de Jugadores Registrados';
        fixturesContainer.appendChild(header);
        
        const ul = document.createElement('ul');
        playersList.forEach(player => {
            const li = document.createElement('li');
            // LA L�NEA CORREGIDA EST� AQU�
            li.textContent = ${player.name} (ELO: ) - Lichess: ;
            ul.appendChild(li);
        });
        fixturesContainer.appendChild(ul);
    } else {
        fixturesContainer.innerHTML = '<p>A�n no hay jugadores importados. �Vuelve pronto!</p>';
    }
});
