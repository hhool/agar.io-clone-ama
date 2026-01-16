

let socket = io.connect('/');
var clock = null;

// called when user presses the start button
function init() {
    var elem = document.documentElement;

    function zoomOutMobile() {
        var viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
            viewport.content = 'initial-scale=0.1';
            viewport.content = 'width=1200';
        }
    }

    zoomOutMobile();
    canvas.width = $(window).width();
    canvas.height = $(window).height();
    draw();
    socket.emit('init', { playerName: player.name });
}

socket.on('initReturn', data => {
    orbs = data.orbs || orbs;
    player.uid = data.uid || player.uid;
    if (data.worldWidth) worldWidth = data.worldWidth;
    if (data.worldHeight) worldHeight = data.worldHeight;
    if (clock) clearInterval(clock);
    clock = setInterval(() => {
        socket.emit('tick', { xVector: player.xVector, yVector: player.yVector });
    }, 16);
});

socket.on('goback', () => {
    socket.emit('init', { playerName: player.name });
});

// Merge AOI/delta updates from server. Server will send { full: true } periodically.
socket.on('tock', data => {
    if (!data) return;
    if (!Array.isArray(players)) players = [];

    if (data.full) {
        players = data.players || [];
        orbs = data.orbs || orbs;
    } else {
        const map = new Map();
        for (const p of players) {
            if (p && p.uid != null) map.set(p.uid, p);
        }
        (data.players || []).forEach(d => {
            const existing = map.get(d.uid);
            if (existing) {
                existing.locX = d.locX;
                existing.locY = d.locY;
                if (d.radius != null) existing.radius = d.radius;
                if (d.color) existing.color = d.color;
                if (d.score != null) existing.score = d.score;
            } else {
                map.set(d.uid, { uid: d.uid, name: d.name || '', locX: d.locX, locY: d.locY, radius: d.radius || 6, color: d.color || 'rgb(200,200,200)', score: d.score || 0 });
            }
        });
        players = Array.from(map.values());
    }

    player.locX = data.playerX || player.locX;
    player.locY = data.playerY || player.locY;
    player.zoom = data.zoom || player.zoom;

    lb = players;
    displayLB();
});

socket.on('orbSwitch', data => {
    if (!data || !Array.isArray(data.orbIndices)) return;
    data.orbIndices.forEach((index, i) => {
        const oldOrb = orbs[index];
        if (oldOrb && typeof spawnOrbAbsorption === 'function') {
            let absorber = null;
            let minDist = Infinity;
            players.forEach(p => {
                const dx = p.locX - oldOrb.locX;
                const dy = p.locY - oldOrb.locY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < (p.radius || 0) + 20 && dist < minDist) {
                    minDist = dist;
                    absorber = p;
                }
            });
            if (absorber) {
                spawnOrbAbsorption(oldOrb.locX, oldOrb.locY, oldOrb.color, oldOrb.radius || 5, absorber.locX, absorber.locY, absorber.radius);
            }
        }
        orbs[index] = (data.newOrbs && data.newOrbs[i]) || orbs[index];
    });
});

function displayLB() {
    let by = 'score';
    if (document.getElementById('sort-score') && document.getElementById('sort-score').classList.contains('active')) by = 'score';
    else if (document.getElementById('sort-orbs') && document.getElementById('sort-orbs').classList.contains('active')) by = 'orbsAbsorbed';
    else if (document.getElementById('sort-players') && document.getElementById('sort-players').classList.contains('active')) by = 'playersKilled';
    const lb_element = document.querySelector('.leader-board');
    if (!lb_element) return;
    lb_element.innerHTML = '';
    if (!Array.isArray(lb)) return;
    lb.sort((a, b) => (b[by] || 0) - (a[by] || 0));
    const top = lb.slice(0, 5);
    top.forEach(p => {
        lb_element.innerHTML += `<li class="leaderboard-player">${p.name} - ${p[by] || 0}</li>`;
    });
}

socket.on('playerDeath', data => {
    if (typeof spawnPlayerAbsorption === 'function' && data.died && data.killedBy) {
        spawnPlayerAbsorption(data.died.locX, data.died.locY, data.died.color || '#ff0000', data.died.radius || 30, data.killedBy.locX, data.killedBy.locY, data.killedBy.radius || 30);
    }
    if (data && data.died && data.killedBy) {
        document.querySelector('#game-message').innerHTML = `${data.died.name} absorbed by ${data.killedBy.name}`;
        $('#game-message').css({ 'background-color': '#00e6e6', opacity: 1 }).show().fadeOut(5000);
        if (player.uid === data.died.uid) {
            $('#game-over-modal').modal('show');
            document.querySelector('#killed-by-dialog').innerHTML = data.killedBy.name;
            document.querySelector('#score-dialog').innerHTML = document.querySelector('.player-score').innerHTML;
            document.querySelector('#players-dialog').innerHTML = player.playersKilled || 0;
            document.querySelector('#orbs-dialog').innerHTML = player.orbsAbsorbed || 0;
        }
    }
});