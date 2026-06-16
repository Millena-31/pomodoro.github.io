const somAlarme = document.getElementById('som-alarme');
const timerDisplay = document.getElementById('timer');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');
const cyclesDisplay = document.getElementById('cycles-count');
const minutesDisplay = document.getElementById('hours-count');
const statusTitulo = document.getElementById('status-titulo');

// Elementos da Meta e Relatório
const goalText = document.getElementById('goal-text');
const goalBar = document.getElementById('goal-bar');
const btnSemanal = document.getElementById('btn-semanal');
const btnMensal = document.getElementById('btn-mensal');
const resumoTotal = document.getElementById('resumo-total');
const resumoMedia = document.getElementById('resumo-media');
const resumoPausa = document.getElementById('resumo-pausa');
const tabelaCorpo = document.getElementById('tabela-historico').getElementsByTagName('tbody')[0];

// ==========================================
// CONFIGURAÇÕES GERAIS (TEMPOS DO POMODORO)
// ==========================================
const TEMPO_FOCO = 25 * 60;          // 25 minutos reais
const TEMPO_INTERVALO = 5 * 60;      // 5 minutos de pausa curta
const TEMPO_PAUSA_LONGA = 15 * 60;   // 15 minutos de pausa longa
const META_DIARIA_MINUTOS = 120;     // Meta diária (2 horas)

// MUDANÇA PARA TESTE RÁPIDO: Se quiser testar o app em segundos, mude aqui:
// const TEMPO_FOCO = 3; const TEMPO_INTERVALO = 2; const TEMPO_PAUSA_LONGA = 5;

let tempoRestante = TEMPO_FOCO; 
let timerId = null;
let modoAtual = 'foco'; 
let filtroRelatorio = 'semanal'; 
let ciclosNaSessaoAtual = 0; 

// BANCO DE DADOS FORMATO LINHA DO TEMPO
let bancoDados = JSON.parse(localStorage.getItem('dadosPomodoroTimeline')) || {};
let meuGrafico = null;

// CORREÇÃO: Função alterada para usar o fuso horário local e evitar saltos de dia incorretos
function formatarData(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

function salvarDados(minutos, tipo) {
    const hojeStr = formatarData(new Date());
    
    if (!bancoDados[hojeStr]) {
        bancoDados[hojeStr] = { foco: 0, intervalo: 0, ciclos: 0 };
    }
    
    if (tipo === 'foco') {
        bancoDados[hojeStr].foco += minutos;
        bancoDados[hojeStr].ciclos += 1;
    } else if (tipo === 'intervalo') {
        bancoDados[hojeStr].intervalo += minutos; // CORREÇÃO: Corrigido de 'minutes' para 'minutos'
    }
    
    localStorage.setItem('dadosPomodoroTimeline', JSON.stringify(bancoDados));
    atualizarInterface();
}

function obterPeriodoAtual() {
    let listaDatas = [];
    let hoje = new Date();
    
    if (filtroRelatorio === 'semanal') {
        for (let i = 6; i >= 0; i--) {
            let d = new Date();
            d.setDate(hoje.getDate() - i);
            listaDatas.push(formatarData(d));
        }
    } else {
        for (let i = 29; i >= 0; i--) {
            let d = new Date();
            d.setDate(hoje.getDate() - i);
            listaDatas.push(formatarData(d));
        }
    }
    return listaDatas;
}

// --- ATUALIZAÇÃO DA TELA (TIMER) ---
function atualizarTelaTimer() {
    const minutos = Math.floor(tempoRestante / 60);
    const segundos = tempoRestante % 60;
    timerDisplay.textContent = `${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
}

// --- ATUALIZAÇÃO DO SISTEMA ---
function atualizarInterface() {
    const hojeStr = formatarData(new Date());
    const dadosHoje = bancoDados[hojeStr] || { foco: 0, intervalo: 0, ciclos: 0 };
    
    cyclesDisplay.textContent = dadosHoje.ciclos;
    minutesDisplay.textContent = dadosHoje.foco;

    const progressoMeta = Math.min((dadosHoje.foco / META_DIARIA_MINUTOS) * 100, 100);
    goalBar.style.width = `${progressoMeta}%`;
    goalText.textContent = `${dadosHoje.foco} / ${META_DIARIA_MINUTOS} min`;
    
    if(progressoMeta >= 100) {
        goalBar.style.backgroundColor = '#2e7d32'; 
    } else {
        goalBar.style.backgroundColor = '#ff4d4d';
    }

    const periodo = obterPeriodoAtual();
    let totalFoco = 0;
    let totalIntervalo = 0;
    let diasAtivos = 0;
    
    let dadosGrafico = [];
    let labelsGrafico = [];

    tabelaCorpo.innerHTML = '';

    periodo.forEach(dataStr => {
        const registro = bancoDados[dataStr] || { foco: 0, intervalo: 0, ciclos: 0 };
        totalFoco += registro.foco;
        totalIntervalo += registro.intervalo;
        if (registro.foco > 0) diasAtivos++;

        dadosGrafico.push(registro.foco);
        
        const partes = dataStr.split('-');
        labelsGrafico.push(`${partes[2]}/${partes[1]}`);

        if (registro.foco > 0 || registro.intervalo > 0) {
            let linha = tabelaCorpo.insertRow(0); 
            linha.insertCell(0).textContent = `${partes[2]}/${partes[1]}/${partes[0]}`;
            linha.insertCell(1).textContent = registro.ciclos;
            linha.insertCell(2).textContent = `${registro.foco} min`;
            linha.insertCell(3).textContent = `${registro.intervalo} min`;
        }
    });

    const horasFoco = Math.floor(totalFoco / 60);
    const minFoco = totalFoco % 60;
    resumoTotal.textContent = `${horasFoco}h ${minFoco}m`;
    resumoPausa.textContent = `${totalIntervalo} min`;
    resumoMedia.textContent = `${diasAtivos > 0 ? Math.round(totalFoco / diasAtivos) : 0} min/dia`;

    if (meuGrafico) {
        meuGrafico.data.labels = labelsGrafico;
        meuGrafico.data.datasets[0].data = dadosGrafico;
        meuGrafico.update();
    }
}

function inicializarGrafico() {
    const ctx = document.getElementById('meuGrafico').getContext('2d');
    meuGrafico = new Chart(ctx, {
        type: 'bar',
        data: { labels: [], datasets: [{ label: 'Minutos Focados', data: [], backgroundColor: '#ff4d4d', borderRadius: 4 }] },
        options: { responsive: true, scales: { y: { beginAtZero: true, grid: { color: '#333' } }, x: { grid: { display: false } } }, plugins: { legend: { display: false } } }
    });
}

// --- MOTORES DO CRONÔMETRO ---
function iniciarTimer() {
    if (timerId !== null) return;
    
    atualizarTelaTimer();

    timerId = setInterval(() => {
        if (tempoRestante > 0) {
            tempoRestante--;
            atualizarTelaTimer();
        } else {
            clearInterval(timerId); 
            timerId = null;
            
            if (somAlarme) somAlarme.play().catch(e => console.log(e));

            if (modoAtual === 'foco') {
                salvarDados(25, 'foco'); 
                ciclosNaSessaoAtual++; 

                if (ciclosNaSessaoAtual >= 4) {
                    alert("Sensacional! Você completou 4 ciclos. Hora de uma pausa longa de 15 minutos!");
                    tempoRestante = TEMPO_PAUSA_LONGA;
                    statusTitulo.textContent = "Pausa Longa Merecida! ☕🔋";
                    ciclosNaSessaoAtual = 0; 
                } else {
                    alert(`Foco concluído! (${ciclosNaSessaoAtual}/4). Hora de uma pausa curta.`);
                    tempoRestante = TEMPO_INTERVALO;
                    statusTitulo.textContent = "Pausa Café ☕";
                }
                
                modoAtual = 'intervalo'; 
                timerDisplay.style.color = "#2e7d32"; 
                
            } else {
                alert("Intervalo encerrado! De volta ao trabalho.");
                const minutosPassados = (statusTitulo.textContent.includes("Longa")) ? 15 : 5;
                salvarDados(minutosPassados, 'intervalo');
                
                modoAtual = 'foco'; 
                statusTitulo.textContent = "Hora de Focar 🍅"; 
                timerDisplay.style.color = "#ff4d4d";
                tempoRestante = TEMPO_FOCO;
            }
            if (somAlarme) { somAlarme.pause(); somAlarme.currentTime = 0; }
            atualizarInterface();
            atualizarTelaTimer();
        }
    }, 1000);
}

function pausarTimer() { 
    clearInterval(timerId); 
    timerId = null; 
}

function resetarTimer() {
    pausarTimer(); 
    modoAtual = 'foco'; 
    ciclosNaSessaoAtual = 0; 
    statusTitulo.textContent = "Hora de Focar 🍅"; 
    timerDisplay.style.color = "#ff4d4d";
    tempoRestante = TEMPO_FOCO; 
    atualizarTelaTimer();
}

// --- EVENTOS DOS SELETORES DO RELATÓRIO ---
btnSemanal.addEventListener('click', () => {
    filtroRelatorio = 'semanal';
    btnSemanal.classList.add('active');
    btnMensal.classList.remove('active');
    atualizarInterface();
});

btnMensal.addEventListener('click', () => {
    filtroRelatorio = 'mensal';
    btnMensal.classList.add('active');
    btnSemanal.classList.remove('active');
    atualizarInterface();
});

startBtn.addEventListener('click', iniciarTimer);
pauseBtn.addEventListener('click', pausarTimer);
resetBtn.addEventListener('click', resetarTimer);

// START DO APP
inicializarGrafico();
atualizarInterface();
atualizarTelaTimer();