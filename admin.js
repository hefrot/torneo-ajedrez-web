const uploadBtn = document.getElementById('upload-btn');
const csvInput = document.getElementById('csv-input');
const statusMessage = document.getElementById('status-message');
const playersRef = database.ref('players');

uploadBtn.addEventListener('click', () => {
    const csvText = csvInput.value.trim();
    if (!csvText) {
        statusMessage.textContent = 'Por favor, pega el CSV.';
        return;
    }

    const newPlayersData = {}; // Usamos un objeto para el .set()
    const lines = csvText.split('\n');
    lines.forEach((line, index) => {
        const [name, elo, lichess] = line.split(',').map(item => item.trim());
        if (name && elo && lichess) {
            // Creamos una clave única para cada jugador
            const playerKey = player_;
            newPlayersData[playerKey] = { name, elo: parseInt(elo), lichess };
        }
    });

    if (Object.keys(newPlayersData).length > 0) {
        playersRef.set(newPlayersData) // .set() reemplaza todos los datos en 'players'
            .then(() => {
                statusMessage.textContent = '¡Jugadores subidos exitosamente!';
                csvInput.value = ''; // Limpia el textarea
            })
            .catch(error => {
                statusMessage.textContent = Error: ;
            });
    } else {
        statusMessage.textContent = 'Formato CSV inválido o campo vacío.';
    }
});
