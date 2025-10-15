// admin.js
const correctPassword = 'hmena2025';
const password = prompt('Ingresa la contraseña para acceder al panel de administración:');

if (password === correctPassword) {
    // La contraseña es correcta, la lógica de la app se ejecuta normalmente.
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

        const newPlayersData = {};
        const lines = csvText.split('\n');
        lines.forEach((line, index) => {
            const [name, elo, lichess] = line.split(',').map(item => item.trim());
            if (name && elo && lichess) {
                const playerKey = `player_${index}`;
                newPlayersData[playerKey] = { name, elo: parseInt(elo), lichess };
            }
        });

        if (Object.keys(newPlayersData).length > 0) {
            playersRef.set(newPlayersData)
                .then(() => {
                    statusMessage.textContent = '¡Jugadores subidos exitosamente!';
                    csvInput.value = '';
                })
                .catch(error => {
                    statusMessage.textContent = `Error: ${error.message}`;
                });
        } else {
            statusMessage.textContent = 'Formato CSV inválido o campo vacío.';
        }
    });
} else {
    // Si la contraseña es incorrecta, reemplaza la página con un mensaje de error.
    document.body.innerHTML = '<div class="container"><h1>Acceso Denegado</h1><p>Contraseña incorrecta.</p></div>';
}
