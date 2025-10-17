/**
 * PANEL DE ADMINISTRACIÓN - FUNCIONALIDAD
 */

import { ref, onValue } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('⚙️ Panel de administración iniciado');
    initializeAdmin();
    setupEventListeners();
    loadPlayersForSelects();
});

// ============================================
// CONFIGURAR EVENT LISTENERS
// ============================================
function setupEventListeners() {
    // Formulario de agregar jugador
    document.getElementById('add-player-form').addEventListener('submit', handleAddPlayer);
    
    // Formulario de pareo manual
    document.getElementById('manual-pairing-form').addEventListener('submit', handleManualPairing);
    
    // Botones de gestión
    document.getElementById('generate-pairings-btn').addEventListener('click', handleGeneratePairings);
    document.getElementById('next-round-btn').addEventListener('click', handleNextRound);
    document.getElementById('reset-tournament-btn').addEventListener('click', handleResetTournament);
    document.getElementById('delete-all-pairings-btn').addEventListener('click', handleDeleteAllPairings);
}

// ============================================
// INICIALIZAR PANEL
// ============================================
function initializeAdmin() {
    // Cargar lista de jugadores
    const playersRef = ref(window.firebaseDatabase, 'players');
    
    onValue(playersRef, (snapshot) => {
        const data = snapshot.val();
        renderAdminPlayersList(data);
    });
    
    // Establecer fecha actual por defecto
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('round-date').value = today;
}

// ============================================
// RENDERIZAR LISTA DE JUGADORES EN ADMIN
// ============================================
function renderAdminPlayersList(playersData) {
    const container = document.getElementById('admin-players-list');
    
    if (!playersData) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <i class="fas fa-users-slash"></i>
                </div>
                <h3 class="empty-state-title">No hay jugadores registrados</h3>
                <p class="empty-state-text">Agrega el primer jugador usando el formulario de arriba.</p>
            </div>
        `;
        return;
    }
    
    const players = Object.keys(playersData).map(key => ({
        id: key,
        ...playersData[key]
    }));
    
    // Ordenar por rating
    players.sort((a, b) => b.rating - a.rating);
    
    let html = '<ul class="cards-grid">';
    
    players.forEach((player, index) => {
        html += `
            <li class="card player-card">
                <div class="player-rank">${index + 1}</div>
                
                <div class="player-info">
                    <h3 class="player-name">${escapeHtml(player.name)}</h3>
                    <div class="player-details">
                        <span class="player-detail">
                            <i class="detail-icon fas fa-star"></i>
                            ${player.rating} ELO
                        </span>
                        <span class="player-detail">
                            <i class="detail-icon fas fa-trophy"></i>
                            ${player.points || 0} pts
                        </span>
                        ${player.whatsapp ? `
                            <span class="player-detail">
                                <i class="detail-icon fab fa-whatsapp"></i>
                                ${escapeHtml(player.whatsapp)}
                            </span>
                        ` : ''}
                    </div>
                </div>
                
                <div class="player-actions">
                    <button class="btn btn-danger" onclick="deletePlayerConfirm('${player.id}', '${escapeHtml(player.name)}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </li>
        `;
    });
    
    html += '</ul>';
    container.innerHTML = html;
}

// ============================================
// CARGAR JUGADORES EN SELECTORES
// ============================================
function loadPlayersForSelects() {
    const playersRef = ref(window.firebaseDatabase, 'players');
    
    onValue(playersRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) return;
        
        const players = Object.keys(data).map(key => ({
            id: key,
            ...data[key]
        }));
        
        // Ordenar alfabéticamente
        players.sort((a, b) => a.name.localeCompare(b.name));
        
        // Actualizar ambos selectores
        const whiteSelect = document.getElementById('white-player');
        const blackSelect = document.getElementById('black-player');
        
        let options = '<option value="">Seleccionar jugador...</option>';
        players.forEach(player => {
            options += `<option value="${player.id}">${escapeHtml(player.name)} (${player.rating})</option>`;
        });
        
        whiteSelect.innerHTML = options;
        blackSelect.innerHTML = options;
    });
}

// ============================================
// MANEJADORES DE EVENTOS
// ============================================

// Agregar jugador
async function handleAddPlayer(e) {
    e.preventDefault();
    
    const name = document.getElementById('player-name').value;
    const rating = document.getElementById('player-rating').value;
    const whatsapp = document.getElementById('player-whatsapp').value;
    
    if (!name || !rating) {
        showAlert('Por favor completa todos los campos obligatorios', 'error');
        return;
    }
    
    showAlert('Agregando jugador...', 'info');
    
    const result = await window.tournamentApp.addPlayer(name, rating, whatsapp);
    
    if (result.success) {
        showAlert(result.message, 'success');
        document.getElementById('add-player-form').reset();
    } else {
        showAlert(result.message, 'error');
    }
}

// Pareo manual
async function handleManualPairing(e) {
    e.preventDefault();
    
    const whiteId = document.getElementById('white-player').value;
    const blackId = document.getElementById('black-player').value;
    const round = document.getElementById('round-number').value;
    const date = document.getElementById('round-date').value;
    
    if (!whiteId || !blackId) {
        showAlert('Selecciona ambos jugadores', 'error');
        return;
    }
    
    if (whiteId === blackId) {
        showAlert('No puedes emparejar un jugador consigo mismo', 'error');
        return;
    }
    
    showAlert('Creando pareo...', 'info');
    
    const dateFormatted = new Date(date).toLocaleDateString('es-ES');
    const result = await window.tournamentApp.createPairing(whiteId, blackId, round, dateFormatted);
    
    if (result.success) {
        showAlert(result.message, 'success');
        document.getElementById('manual-pairing-form').reset();
    } else {
        showAlert(result.message, 'error');
    }
}

// Generar pareos automáticos
async function handleGeneratePairings() {
    const round = document.getElementById('round-number').value;
    
    if (!confirm(`¿Generar pareos automáticos para la ronda ${round}?`)) {
        return;
    }
    
    showAlert('Generando pareos...', 'info');
    
    const result = await window.tournamentApp.generatePairings(round);
    
    if (result.success) {
        showAlert(result.message, 'success');
    } else {
        showAlert(result.message, 'error');
    }
}

// Avanzar ronda
function handleNextRound() {
    const currentRound = parseInt(document.getElementById('round-number').value);
    const nextRound = currentRound + 1;
    
    document.getElementById('round-number').value = nextRound;
    showAlert(`Listo para configurar la ronda ${nextRound}`, 'info');
}

// Reiniciar torneo
async function handleResetTournament() {
    const confirmation = prompt('⚠️ ADVERTENCIA: Esto eliminará TODOS los datos del torneo.\n\nEscribe "REINICIAR" para confirmar:');
    
    if (confirmation !== 'REINICIAR') {
        showAlert('Operación cancelada', 'info');
        return;
    }
    
    showAlert('Reiniciando torneo...', 'info');
    
    const result = await window.tournamentApp.resetTournament();
    
    if (result.success) {
        showAlert(result.message, 'success');
        setTimeout(() => {
            window.location.reload();
        }, 2000);
    } else {
        showAlert(result.message, 'error');
    }
}

// Eliminar todos los pareos
async function handleDeleteAllPairings() {
    if (!confirm('⚠️ ¿Eliminar TODOS los pareos del torneo?')) {
        return;
    }
    
    showAlert('Eliminando pareos...', 'info');
    
    try {
        const { remove, ref: dbRef } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js');
        await remove(dbRef(window.firebaseDatabase, 'pairings'));
        showAlert('Todos los pareos han sido eliminados', 'success');
    } catch (error) {
        showAlert('Error al eliminar pareos', 'error');
    }
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

// Eliminar jugador con confirmación
window.deletePlayerConfirm = async function(playerId, playerName) {
    if (!confirm(`¿Eliminar a ${playerName} del torneo?`)) {
        return;
    }
    
    showAlert('Eliminando jugador...', 'info');
    
    const result = await window.tournamentApp.deletePlayer(playerId);
    
    if (result.success) {
        showAlert(result.message, 'success');
    } else {
        showAlert(result.message, 'error');
    }
}

// Sistema de alertas
function showAlert(message, type = 'info') {
    const container = document.getElementById('alerts-container');
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        info: 'fas fa-info-circle'
    };
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
        <i class="${icons[type]}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(alert);
    
    // Auto-remover después de 5 segundos
    setTimeout(() => {
        alert.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => alert.remove(), 300);
    }, 5000);
}

// Escapar HTML
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

// Animación de fade out
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        from {
            opacity: 1;
            transform: translateY(0);
        }
        to {
            opacity: 0;
            transform: translateY(-10px);
        }
    }
`;
document.head.appendChild(style);