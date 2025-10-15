document.getElementById('import-button').addEventListener('click', () => {
  const csvData = document.getElementById('csv-data').value;
  const players = csvData.split('\n').filter(line => line.trim() !== '');

  if (players.length === 0) {
    alert('Por favor, pega los datos de los jugadores.');
    return;
  }

  // Obtenemos una referencia a la base de datos para 'players'
  const playersRef = database.ref('players');
  
  // Borramos los jugadores anteriores para empezar de cero
  playersRef.remove()
    .then(() => {
      console.log('Jugadores anteriores eliminados.');
      // Subimos cada jugador nuevo
      players.forEach(playerLine => {
        const [name, elo, club] = playerLine.split(',');
        if (name && elo && club) {
          database.ref('players').push({
            name: name.trim(),
            elo: parseInt(elo.trim(), 10),
            club: club.trim()
          });
        }
      });
      alert('¡' + players.length + ' jugadores importados con éxito!');
      document.getElementById('csv-data').value = ''; // Limpiamos el campo
    })
    .catch(error => {
      console.error('Error al importar:', error);
      alert('Hubo un error al importar los jugadores.');
    });
});
