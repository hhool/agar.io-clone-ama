

let socket = io.connect('/')
var clock = null;


//called when user presses the start button
function init() {
    var elem = document.documentElement;
    function zoomOutMobile() {
        var viewport = document.querySelector('meta[name="viewport"]');

        if (viewport) {
            viewport.content = "initial-scale=0.1";
            viewport.content = "width=1200";
        }
    }

    zoomOutMobile();
    canvas.width = $(window).width();
    canvas.height = $(window).height();
    draw();
    socket.emit('init', {
        playerName: player.name
    });
}

socket.on('initReturn', data => {
    orbs = data.orbs;
    player.uid = data.uid;
    // receive world dimensions from server
    if (data.worldWidth) worldWidth = data.worldWidth;
    if (data.worldHeight) worldHeight = data.worldHeight;
    clock = setInterval(() => {
        socket.emit('tick', {
            xVector: player.xVector,
            yVector: player.yVector
        })
    }, 16)
})

socket.on('goback', () => {
    socket.emit('init', {
        playerName: player.name
    });
})

socket.on('tock', data => {
    players = data.players;
    player.locX = data.playerX;

    player.locY = data.playerY;
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        // true for mobile device
        player.zoom = 2.4 * data.zoom;
    } else {
        // false for not mobile device
        player.zoom = data.zoom;
    }
        // Merge AOI/delta updates from server. Server will send { full: true } periodically.
        if (!data) return;
        // Ensure players is an array we can merge into
        if (!Array.isArray(players)) players = [];

        if (data.full) {
            // Replace visible lists with full payload
            players = data.players || [];
            orbs = data.orbs || [];
        } else {
            // Merge player deltas into existing players map (preserve names/colors if present locally)
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

            // For orbs, we'll replace the set in full frames; for delta frames we can optionally ignore or update positions.
            // Keep existing `orbs` to avoid replacing a large array with small deltas here.
        }

        player.locX = data.playerX || player.locX;
        player.locY = data.playerY || player.locY;
        player.zoom = data.zoom || player.zoom;

        // update leaderboard and UI
        lb = players;
        displayLB();
        }
    })
    lb = players;
    displayLB();

})

socket.on('orbSwitch', data => {
    data.orbIndices.forEach((index, i) => {
        const oldOrb = orbs[index];
        
        // Find the player who absorbed it
        if (oldOrb && typeof spawnOrbAbsorption === 'function') {
            let absorber = null;
            let minDist = Infinity;
            
            players.forEach(p => {
                const dx = p.locX - oldOrb.locX;
                const dy = p.locY - oldOrb.locY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < p.radius + 20 && dist < minDist) {
                    minDist = dist;
                    absorber = p;
                }
            });
            
            // Spawn suction effect toward the absorber
            if (absorber) {
                spawnOrbAbsorption(
                    oldOrb.locX, oldOrb.locY, oldOrb.color, oldOrb.radius || 5,
                    absorber.locX, absorber.locY, absorber.radius
                );
            }
        }
        
        orbs[index] = data.newOrbs[i];
    })
})


function displayLB() {
    let by = null;
    if (document.getElementById('sort-score').classList.contains('active')) {
        by = 'score';
    }
    else if (document.getElementById('sort-orbs').classList.contains('active')) {
        by = 'orbsAbsorbed';
    }
    else if (document.getElementById('sort-players').classList.contains('active')) {
        by = 'playersKilled';
    }
    let lb_element = document.querySelector('.leader-board');
    lb_element.innerHTML = "";
    lb.sort((a, b) => b[by] - a[by]);
    lb = lb.slice(0, 5);
    lb.forEach(p => {
        lb_element.innerHTML += `<li class="leaderboard-player">${p.name} - ${p[by]}</li>`
    })
}

socket.on('playerDeath', data => {
    // Spawn dramatic player absorption effect - sucked into killer
    if (typeof spawnPlayerAbsorption === 'function' && data.died && data.killedBy) {
        spawnPlayerAbsorption(
            data.died.locX, 
            data.died.locY, 
            data.died.color || '#ff0000',
            data.died.radius || 30,
            data.killedBy.locX,
            data.killedBy.locY,
            data.killedBy.radius || 30
        );
    }
    
    document.querySelector('#game-message').innerHTML = `${data.died.name} absorbed by ${data.killedBy.name}`
    $('#game-message').css({
        "background-color": "#00e6e6",
        "opacity": 1
    });
    $('#game-message').show();
    $('#game-message').fadeOut(5000);
    if (player.uid === data.died.uid) {
        $('#game-over-modal').modal('show');
        document.querySelector('#killed-by-dialog').innerHTML = data.killedBy.name;
        document.querySelector('#score-dialog').innerHTML = document.querySelector('.player-score').innerHTML;
        document.querySelector('#players-dialog').innerHTML = player.playersKilled;
        document.querySelector('#orbs-dialog').innerHTML = player.orbsAbsorbed;
    }
})