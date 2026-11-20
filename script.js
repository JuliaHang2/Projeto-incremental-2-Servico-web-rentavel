const lista = document.querySelector('#lista-notas');
const form = document.querySelector('#form-notas');
const resultado = document.querySelector('#resultado');
const aviso = document.querySelector('#aviso');
let ultimoResultado = '';

document.querySelector('#ano').textContent = new Date().getFullYear();

function criarLinha(nome = '', nota = '', peso = '1') {
  const linha = document.createElement('div');
  linha.className = 'linha-nota';
  linha.innerHTML = `
    <input class="nome" type="text" placeholder="Nome da avaliação" aria-label="Nome da avaliação" maxlength="35">
    <input class="nota" type="number" min="0" max="10" step="0.1" placeholder="0,0" aria-label="Nota">
    <input class="peso" type="number" min="0.1" max="100" step="0.1" value="1" aria-label="Peso" required>
    <button class="remover" type="button" aria-label="Remover avaliação" title="Remover">×</button>
  `;
  linha.querySelector('.nome').value = nome;
  linha.querySelector('.nota').value = nota;
  linha.querySelector('.peso').value = peso;
  return linha;
}

document.querySelector('#adicionar').addEventListener('click', () => {
  lista.appendChild(criarLinha());
  lista.lastElementChild.querySelector('.nome').focus();
});

lista.addEventListener('click', (event) => {
  if (event.target.classList.contains('remover')) {
    if (lista.children.length === 1) {
      aviso.textContent = 'Mantenha pelo menos uma avaliação.';
      return;
    }
    event.target.closest('.linha-nota').remove();
    aviso.textContent = '';
  }
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  aviso.textContent = '';

  const linhas = [...lista.querySelectorAll('.linha-nota')];
  const avaliacoes = linhas.map((linha, index) => {
    const notaInput = linha.querySelector('.nota');
    const pesoInput = linha.querySelector('.peso');
    const nota = notaInput.value === '' ? null : Number(notaInput.value);
    const peso = Number(pesoInput.value);
    return {
      nome: linha.querySelector('.nome').value.trim() || `Avaliação ${index + 1}`,
      nota, peso, notaInput, pesoInput
    };
  });

  const alvo = Number(document.querySelector('#media-alvo').value);
  const futuras = avaliacoes.filter(a => a.nota === null);
  const realizadas = avaliacoes.filter(a => a.nota !== null);

  const pesoInvalido = avaliacoes.find(a =>
    a.pesoInput.value === '' || !Number.isFinite(a.peso) || a.peso <= 0
  );
  const notaInvalida = realizadas.find(a =>
    !Number.isFinite(a.nota) || a.nota < 0 || a.nota > 10
  );

  if (pesoInvalido) {
    aviso.textContent = 'Informe um peso válido e maior que zero para cada avaliação.';
    pesoInvalido.pesoInput.focus();
    return;
  }
  if (notaInvalida) {
    aviso.textContent = 'As notas preenchidas devem estar entre 0 e 10.';
    notaInvalida.notaInput.focus();
    return;
  }
  if (realizadas.length === 0) {
    aviso.textContent = 'Preencha pelo menos uma nota de uma avaliação que você já fez.';
    avaliacoes[0].notaInput.focus();
    return;
  }
  if (futuras.length > 1) {
    aviso.textContent = 'Deixe apenas uma nota em branco: ela será considerada sua próxima avaliação.';
    futuras[1].notaInput.focus();
    return;
  }
  if (!Number.isFinite(alvo) || alvo < 0 || alvo > 10) {
    aviso.textContent = 'A média desejada deve estar entre 0 e 10.';
    return;
  }

  const somaPesos = realizadas.reduce((soma, a) => soma + a.peso, 0);
  const somaPonderada = realizadas.reduce((soma, a) => soma + a.nota * a.peso, 0);
  const media = somaPonderada / somaPesos;

  // Usa o peso da linha sem nota; se todas estiverem preenchidas, considera peso 1.
  const pesoProxima = futuras.length === 1 ? futuras[0].peso : 1;
  const notaNecessaria = alvo * (somaPesos + pesoProxima) - somaPonderada;
  const mediaFormatada = media.toFixed(2).replace('.', ',');
  const atingiu = media >= alvo;

  document.querySelector('#media-final').textContent = mediaFormatada;
  document.querySelector('#status').textContent = atingiu ? 'Meta atingida!' : 'Continue assim!';
  document.querySelector('#status').classList.toggle('atencao', !atingiu);
  document.querySelector('#progresso').style.width = `${Math.min(media / 10 * 100, 100)}%`;

  let texto;
  if (atingiu) {
    texto = `Sua média atual já está acima da meta de ${alvo.toFixed(1).replace('.', ',')}.`;
  } else if (notaNecessaria <= 10) {
    texto = `Para alcançar média ${alvo.toFixed(1).replace('.', ',')}, você precisa tirar ${Math.max(0, notaNecessaria).toFixed(2).replace('.', ',')} na próxima avaliação (peso ${pesoProxima.toString().replace('.', ',')}).`;
  } else {
    texto = `Você precisaria tirar ${notaNecessaria.toFixed(2).replace('.', ',')} na próxima avaliação, mas a nota máxima é 10. Será necessário mais de uma avaliação para alcançar essa meta.`;
  }

  document.querySelector('#mensagem').textContent = texto;
  resultado.hidden = false;

  ultimoResultado = `CalculaNota\\nMédia atual: ${mediaFormatada}\\n${texto}`;
  localStorage.setItem('calculanota-ultimo-resultado', JSON.stringify({
    media, alvo, avaliacoes: avaliacoes.map(({nome, nota, peso}) => ({nome, nota, peso})), texto
  }));
});

document.querySelector('#copiar').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(ultimoResultado);
    document.querySelector('#copiar').textContent = 'Copiado!';
  } catch {
    aviso.textContent = 'Não foi possível copiar. Verifique a permissão do navegador.';
  }
});

document.querySelector('#compartilhar').addEventListener('click', async () => {
  if (!ultimoResultado) return;
  if (navigator.share) {
    try { await navigator.share({ title: 'Meu resultado — CalculaNota', text: ultimoResultado }); }
    catch (error) { if (error.name !== 'AbortError') aviso.textContent = 'Não foi possível compartilhar.'; }
  } else {
    try {
      await navigator.clipboard.writeText(ultimoResultado);
      document.querySelector('#compartilhar').textContent = 'Resultado copiado';
    } catch {
      aviso.textContent = 'Seu navegador não oferece compartilhamento ou cópia neste contexto.';
    }
  }
});

// Recupera o último cálculo salvo no navegador.
const salvo = localStorage.getItem('calculanota-ultimo-resultado');
if (salvo) {
  try {
    const dados = JSON.parse(salvo);
    if (Array.isArray(dados.avaliacoes) && dados.avaliacoes.length) {
      lista.innerHTML = '';
      dados.avaliacoes.forEach(a => lista.appendChild(criarLinha(a.nome, a.nota, a.peso)));
    }
  } catch {
    localStorage.removeItem('calculanota-ultimo-resultado');
  }
}
