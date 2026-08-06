// ============================================================
// VELHA// duelo — lógica do jogo
// ============================================================

const WIN_LINES = [
  [0,1,2],[3,4,5],[6,7,8], // linhas
  [0,3,6],[1,4,7],[2,5,8], // colunas
  [0,4,8],[2,4,6]          // diagonais
];

let roomCode = null;
let mySymbol = null; // 'X' ou 'O'
let roomRef = null;
let unsubscribe = null;
let currentRoomData = null;

// ---------- elementos ----------
const el = {
  lobby: document.getElementById('lobby'),
  game: document.getElementById('game'),
  tabCreate: document.getElementById('tab-create'),
  tabJoin: document.getElementById('tab-join'),
  viewCreate: document.getElementById('view-create'),
  viewJoin: document.getElementById('view-join'),
  btnCreate: document.getElementById('btn-create'),
  btnJoin: document.getElementById('btn-join'),
  nameCreate: document.getElementById('name-create'),
  nameJoin: document.getElementById('name-join'),
  codeJoin: document.getElementById('code-join'),
  lobbyError: document.getElementById('lobby-error'),
  roomCodeDisplay: document.getElementById('room-code-display'),
  btnCopy: document.getElementById('btn-copy'),
  statusText: document.getElementById('status-text'),
  youAre: document.getElementById('you-are'),
  board: document.getElementById('board'),
  btnRematch: document.getElementById('btn-rematch'),
  btnLeave: document.getElementById('btn-leave'),
};

// ---------- tabs do lobby ----------
el.tabCreate.onclick = () => {
  el.tabCreate.classList.add('active');
  el.tabJoin.classList.remove('active');
  el.viewCreate.classList.remove('hidden');
  el.viewJoin.classList.add('hidden');
  hideError();
};
el.tabJoin.onclick = () => {
  el.tabJoin.classList.add('active');
  el.tabCreate.classList.remove('active');
  el.viewJoin.classList.remove('hidden');
  el.viewCreate.classList.add('hidden');
  hideError();
};

function hideError(){ el.lobbyError.style.display = 'none'; }
function showError(msg){
  el.lobbyError.textContent = msg;
  el.lobbyError.style.display = 'block';
}

function genCode(){
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for(let i=0;i<4;i++) out += chars[Math.floor(Math.random()*chars.length)];
  return out;
}

// IMPORTANTE: usamos "" em vez de null nas células vazias.
// O Firebase Realtime Database trata null como "apagar" dentro de arrays,
// então um array cheio de null vira um array truncado assim que uma célula
// é preenchida. String vazia evita esse problema.
function emptyBoard(){ return Array(9).fill(''); }

// ---------- criar sala ----------
el.btnCreate.onclick = async () => {
  hideError();
  el.btnCreate.disabled = true;
  const code = genCode();
  const name = (el.nameCreate.value || 'Jogador X').trim();

  try{
    await db.ref('rooms/' + code).set({
      board: emptyBoard(),
      turn: 'X',
      winner: null,
      winLine: null,
      players: { X: name, O: null },
      rematch: { X: false, O: false },
      createdAt: firebase.database.ServerValue.TIMESTAMP
    });
    enterRoom(code, 'X');
  }catch(e){
    showError('Não deu pra criar a sala. Confere se preencheu firebase-config.js direitinho.');
    el.btnCreate.disabled = false;
  }
};

// ---------- entrar em sala ----------
el.btnJoin.onclick = async () => {
  hideError();
  const code = el.codeJoin.value.trim().toUpperCase();
  const name = (el.nameJoin.value || 'Jogador O').trim();
  if(code.length !== 4){
    showError('O código tem 4 caracteres.');
    return;
  }
  el.btnJoin.disabled = true;

  try{
    const snap = await db.ref('rooms/' + code).get();
    if(!snap.exists()){
      showError('Sala não encontrada. Confere o código.');
      el.btnJoin.disabled = false;
      return;
    }
    const data = snap.val();
    if(data.players && data.players.O){
      showError('Essa sala já tem os dois jogadores.');
      el.btnJoin.disabled = false;
      return;
    }
    await db.ref('rooms/' + code + '/players/O').set(name);
    enterRoom(code, 'O');
  }catch(e){
    showError('Erro ao entrar na sala. Tenta de novo.');
    el.btnJoin.disabled = false;
  }
};

// ---------- entrar na sala (comum) ----------
function enterRoom(code, symbol){
  roomCode = code;
  mySymbol = symbol;
  roomRef = db.ref('rooms/' + code);

  el.lobby.classList.add('hidden');
  el.game.classList.remove('hidden');
  el.roomCodeDisplay.textContent = code;
  el.youAre.textContent = `você é ${symbol === 'X' ? 'X' : 'O'}`;
  el.youAre.className = 'you-are ' + (symbol === 'X' ? 'turn-x' : 'turn-o');

  renderBoard(emptyBoard(), null, null);

  unsubscribe = roomRef.on('value', (snap) => {
    if(!snap.exists()){
      el.statusText.textContent = 'a sala foi encerrada.';
      return;
    }
    currentRoomData = snap.val();
    render(currentRoomData);
  });

  roomRef.onDisconnect(); // placeholder — sala permanece no banco (simples e suficiente pro uso casual)
}

// ---------- renderização ----------
function render(data){
  const board = data.board || emptyBoard();
  const bothJoined = data.players && data.players.X && data.players.O;

  renderBoard(board, data.winLine, data.winner);

  if(!bothJoined){
    el.statusText.innerHTML = 'esperando o segundo jogador<span class="waiting-dots"></span>';
    el.statusText.className = 'status-text';
    return;
  }

  if(data.winner === 'draw'){
    el.statusText.textContent = 'empate!';
    el.statusText.className = 'status-text';
    return;
  }

  if(data.winner){
    const iWon = data.winner === mySymbol;
    el.statusText.textContent = iWon ? 'você ganhou! 🏆' : `${data.winner} ganhou.`;
    el.statusText.className = 'status-text ' + (data.winner === 'X' ? 'turn-x' : 'turn-o');
    return;
  }

  const isMyTurn = data.turn === mySymbol;
  el.statusText.textContent = isMyTurn ? 'sua vez' : `vez de ${data.turn}`;
  el.statusText.className = 'status-text ' + (data.turn === 'X' ? 'turn-x' : 'turn-o');
}

function renderBoard(board, winLine, winner){
  el.board.innerHTML = '';
  board.forEach((val, i) => {
    const cell = document.createElement('div');
    cell.className = 'cell' + (val ? ' filled ' + val.toLowerCase() : '');
    if(winLine && winLine.includes(i)) cell.classList.add('win');
    cell.textContent = val || '';
    cell.onclick = () => makeMove(i);
    el.board.appendChild(cell);
  });
}

// ---------- jogar ----------
async function makeMove(i){
  if(!currentRoomData) return;
  const data = currentRoomData;
  const board = data.board || emptyBoard();

  const bothJoined = data.players && data.players.X && data.players.O;
  if(!bothJoined) return;
  if(data.winner) return;
  if(data.turn !== mySymbol) return;
  if(board[i]) return;

  board[i] = mySymbol;
  const { winner, line } = checkWinner(board);
  const nextTurn = mySymbol === 'X' ? 'O' : 'X';

  await roomRef.update({
    board: board,
    turn: nextTurn,
    winner: winner,
    winLine: line
  });
}

function checkWinner(board){
  for(const line of WIN_LINES){
    const [a,b,c] = line;
    if(board[a] && board[a] === board[b] && board[a] === board[c]){
      return { winner: board[a], line: line };
    }
  }
  if(board.every(v => v !== '')){
    return { winner: 'draw', line: null };
  }
  return { winner: null, line: null };
}

// ---------- revanche ----------
el.btnRematch.onclick = async () => {
  if(!roomRef || !mySymbol) return;
  await roomRef.update({
    ['rematch/' + mySymbol]: true
  });
  const snap = await roomRef.child('rematch').get();
  const r = snap.val() || {};
  if(r.X && r.O){
    await roomRef.update({
      board: emptyBoard(),
      turn: 'X',
      winner: null,
      winLine: null,
      rematch: { X: false, O: false }
    });
  }
};

// ---------- sair ----------
el.btnLeave.onclick = () => {
  if(roomRef && unsubscribe) roomRef.off('value', unsubscribe);
  if(roomRef && mySymbol){
    roomRef.child('players/' + mySymbol).remove();
  }
  roomCode = null;
  mySymbol = null;
  roomRef = null;
  currentRoomData = null;
  el.game.classList.add('hidden');
  el.lobby.classList.remove('hidden');
  el.btnCreate.disabled = false;
  el.btnJoin.disabled = false;
  el.codeJoin.value = '';
};

// ---------- copiar código ----------
el.btnCopy.onclick = () => {
  navigator.clipboard.writeText(roomCode).then(() => {
    el.btnCopy.textContent = 'copiado!';
    setTimeout(() => el.btnCopy.textContent = 'copiar código', 1500);
  });
};
