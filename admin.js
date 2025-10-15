document.getElementById('import-button').addEventListener('click', () => {
  const csvData = document.getElementById('csv-data').value;
  const players = csvData.split('\n').filter(line => line.trim() !== '');

  if (players.length === 0) {
    alert('Por favor, pega los datos de los jugadores.');
    return;
  }

  const playersRef = database.ref('players');
  
  playersRef.remove()
    .then(() => {
      console.log('Jugadores anteriores eliminados.');
      players.forEach(playerLine => {
        const [name, elo, lichess] = playerLine.split(','); // <-- CAMBIO AQUÍ
        if (name && elo && lichess) { // <-- CAMBIO AQUÍ
          database.ref('players').push({
            name: name.trim(),
            elo: parseInt(elo.trim(), 10),
            lichess: lichess.trim() // <-- CAMBIO AQUÍ
          });
        }
      });
      alert('¡' + players.length + ' jugadores importados con éxito!');
      document.getElementById('csv-data').value = '';
    })
    .catch(error => {
      console.error('Error al importar:', error);
      alert('Hubo un error al importar los jugadores.');
    });
});
