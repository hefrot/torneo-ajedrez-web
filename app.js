console.log("app.js se está ejecutando...");

const fixturesContainer = document.getElementById('fixtures-container');
const playersRef = database.ref('players');

console.log("Intentando conectar a Firebase en /players...");

playersRef.on('value', (snapshot) => {
    console.log("¡Conexión exitosa! Datos recibidos:", snapshot.val());
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
            li.textContent = `${player.name} (ELO: ${player.elo}) - Lichess: ${player.lichess}`;
            ul.appendChild(li);
        });
        fixturesContainer.appendChild(ul);
    } else {
        console.log("No se encontraron datos en /players.");
        fixturesContainer.innerHTML = '<p>Aún no hay jugadores importados.</p>';
    }
}, (error) => {
    console.error("Error al conectar con Firebase:", error);
    fixturesContainer.innerHTML = `<p style="color:red;">Error al cargar datos: ${error.message}</p>`;
});
