(() => {
	const P1 = 'X';
	const P2 = 'O';
	const socket = io.connect('http://localhost:5000');

    let Player = function (name, type) {
        this.name = name;
        this.type = type;
        this.currentTurn = true;
        this.movesPlayed = 0;
    }

    Player.wins = [7, 56, 448, 73, 146, 292, 273, 84];

    Player.prototype.updateMovesPlayed = function(tileValue) {
        this.movesPlayed += tileValue;
    }

    Player.prototype.getMovesPlayed = function() {
        return this.movesPlayed;
    }

    Player.prototype.getPlayerName = function() {
        return this.name;
    }

    Player.prototype.getPlayerType = function() {
        return this.type;
    }

    Player.prototype.getCurrentTurn = function() {
        return this.currentTurn;
    }

    Player.prototype.setCurrentTurn = function(turn) {
        this.currentTurn = turn;
    }

    let Game = function(roomId) {
        this.roomId = roomId;
        this.board = [];
        this.moves = 0;
    }

    Game.prototype.createGameBoard = function() {
        for(let i = 0; i < 3; i++) {
            this.board.push(['','','']);
            for (let j = 0; j < 3; j++) {
                $(`#button_${i}${j}`).on('click', () => {
                    let tile = `button_${i}${j}`;
                    if (!player.getCurrentTurn()) {
                        alert('It\'s not your turn!');
                        return;
                    }

                    if ($(this).prop('disabled')) alert('This tile has already been played on!');

                    const row = parseInt(tile.split('_')[1][0]);
                    const col = parseInt(tile.split('_')[1][1]);

                    game.playerTurn(tile);
                    game.updateBoard(player.getPlayerType(), row, col, tile);

                    player.setCurrentTurn(false);
                    player.updateMovesPlayed(1 << (row * 3 + col));

                    socket.emit('turnPlayed', ({tile: tile, room: this.roomId}));
                    game.checkWinner();
                    return false;
                });
            }
        }
    }

    Game.prototype.displayBoard = function(message) {
        $('.menu').css('display', 'none');
        $('.gameBoard').css('display', 'block');
        $('#userHello').html(message);
        this.createGameBoard();
    }

    Game.prototype.updateBoard = function(type, row, col, tile) {
        $(`#${tile}`).text(type);
        $(`#${tile}`).prop('disabled', true);
        this.board[row][col] = type;
        this.moves++;
    }
    Game.prototype.getRoomId = function() {
        return this.roomId;
    }

    Game.prototype.playerTurn = function(tile) {
        console.log("player turn", tile);
        const turnObj = {
            tile,
            room: this.getRoomId()
        };

        socket.emit('playerTurn', turnObj);
    }

    Game.prototype.checkWinner = function() {
        const currentPlayerPositions = player.getMovesPlayed();
        Player.wins.forEach((winningPosition) => {
            if (winningPosition & currentPlayerPositions == winningPosition) {
                game.announceWinner();
            }
        });
        const tied = this.checkTie();
        if( tied ){
            socket.emit('gameEnded', {room: this.getRoomId(), message: 'Game Tied :('});
            alert('Tie game!');
            location.reload();
        }
    }

    Game.prototype.checkTie = function() {
        return this.moves >= 9;
    }

    Game.prototype.announceWinner = function() {
        const message = `${player.getPlayerType()} wins!`;
        socket.emit('gameEnded', {room: this.getRoomId(), message: message});
        alert(message);
        location.reload();
    }

    Game.prototype.endGame = function(message) {
        alert(message);
        location.reload()
    }


	$('#new').on('click', () => {
		const name = $('#nameNew').val();
		if( !name ){
			alert('Please enter your name.');
			return;
		}
		socket.emit('createGame', {name: name});
		player = new Player(name, P1);
	});

	$('#join').on('click', () => {
        const name = $('#nameJoin').val();
        const roomID = $('#room').val();
        if( !name || !roomID ){
            alert('Please enter your name and game ID.');
            return;
        }
        socket.emit('joinGame', {name: name, room: roomID});
        player = new Player(name, P2);
    });

    socket.on('newGame', (data) => {
        const message = `Hello ${data.name}. Please ask your friend to enter Game ID: ${data.room}. Waiting for player 2...`;
        game = new Game(data.room);
        game.displayBoard(message);
    });

    socket.on('player1', (data) => {
        const message = `Hello, ${player.getPlayerName()}`;
        $('#userHello').html(message);
        player.setCurrentTurn(true);
    });

    socket.on('player2', (data) => {
        const message = `Hello, ${data.name}`;

        game = new Game(data.room);
        game.displayBoard(message);
        player.setCurrentTurn(false);
    });

    socket.on('turnPlayed', (data) => {
        console.log(data);
        if (data.tile) {
            const row = data.tile.split('_')[1][0];
            const col = data.tile.split('_')[1][1];
            const opponentType = player.getPlayerType() == P1 ? P2 : P1;
            game.updateBoard(opponentType, row, col, data.tile);
            player.setCurrentTurn(true);
        }
    });

    socket.on('gameEnd', (data) => {
        game.endGame(data.message);
        socket.leave(data.room);
    });

    socket.on('err', (data) => {
        game.endgame(data.message);
    });
})();