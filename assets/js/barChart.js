class BarChartD3 {
    constructor(containerId) {
        this.containerId = containerId;
        this.benchmarkData = {};
        this.models = {};
        this.currentBenchmark = null;
        this.currentData = [];
        this.sortOrder = 'score-desc';

        this.maxModelsToShow = 20;
        this.showTopModelsOnly = true;
        
        // Dimensioni
        this.margin = { top: 60, right: 30, bottom: 100, left: 180 };
        this.width = 0;
        this.height = 0;
        
        // Elementi DOM
        this.svg = null;
        this.xScale = null;
        this.yScale = null;
        this.colorScale = null;
        
        // Configurazione colori
        this.colors = {
            low: '#e74c3c',
            medium: '#f39c12',
            high: '#2ecc71'
        };
    }
    
    // Inizializza con dati dai CSV già caricati
    initFromPolarData(benchmarkData, models) {
        console.log('BarChart: initializing with polar chart data');
        this.benchmarkData = benchmarkData;
        this.models = models;
        
        // DEBUG: log dei dati ricevuti
        console.log(`BarChart received: ${Object.keys(benchmarkData).length} benchmarks, ${Object.keys(models).length} models`);
        
        this.initializeUI();
        this.populateBenchmarkSelect();
    }
    
    // Inizializza UI
    initializeUI() {
        console.log('BarChart: initializing UI');
        
        // Verifica che gli elementi esistano
        if (!document.getElementById('barBenchmarkSelect') || 
            !document.getElementById('barChartSvg')) {
            console.error('Required HTML elements not found for bar chart');
            return;
        }
        
        // Calcola dimensioni
        this.calculateDimensions();
        
        // Crea SVG (se non esiste già)
        this.createSVG();
        
        // Crea tooltip
        this.createTooltip();
        
        // Aggiungi event listeners
        document.getElementById('barBenchmarkSelect').addEventListener('change', (e) => {
            console.log('Benchmark selected:', e.target.value);
            this.currentBenchmark = e.target.value;
            this.updateChart();
        });
        
        document.getElementById('barModelSort').addEventListener('change', (e) => {
            this.sortOrder = e.target.value;
            this.updateChart();
        });
        
        // Gestisci resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

    
    // Popola la select dei benchmark
    populateBenchmarkSelect() {
        const select = document.getElementById('barBenchmarkSelect');
        if (!select) return;
        
        select.innerHTML = '<option value="" disabled selected>Select a benchmark...</option>';
        
        // Ordina benchmark per nome
        const benchmarks = Object.values(this.benchmarkData)
            .sort((a, b) => a.name.localeCompare(b.name));
        
        benchmarks.forEach(benchmark => {
            // Conta quanti modelli hanno questo benchmark
            const modelCount = benchmark.scores.length;
            if (modelCount > 0) {
                const option = document.createElement('option');
                option.value = benchmark.id;
                option.textContent = `${benchmark.name} (${modelCount} models)`;
                select.appendChild(option);
            }
        });

            if (benchmarks.length > 0) {
            const firstValid = benchmarks.find(b => 
                (b.scores && b.scores.length > 0) || 
                (b.models && Object.keys(b.models).length > 0)
            );

            if (firstValid) {
                select.value = firstValid.id;
                this.currentBenchmark = firstValid.id;
                // Un piccolo timeout assicura che il DOM sia stabile
                setTimeout(() => this.updateChart(), 100);
            }
        }
    }
    
    // Crea SVG
    createSVG() {
        const container = d3.select(`#${this.containerId}`);
        let svgElement = container.select('svg');
        
        // Se l'SVG non esiste affatto, crealo
        if (svgElement.empty()) {
            svgElement = container.append('svg')
                .attr('id', 'barChartSvg')
                .attr('width', '100%')
                .attr('height', '100%');
        }

        // Aggiorna sempre il viewBox per il responsive
        svgElement.attr('viewBox', `0 0 ${this.width} ${this.height}`);

        // Gestione del gruppo principale <g>
        this.svg = svgElement.select('g.main-group');
        
        if (this.svg.empty()) {
            // Se il gruppo non esiste (come nel tuo caso attuale), crealo
            this.svg = svgElement.append('g')
                .attr('class', 'main-group')
                .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
        }
    }

    // Calcola le dimensioni effettive del container
    calculateDimensions() {
        const wrapper = document.querySelector('.bar-chart-wrapper');
        if (wrapper) {
            const style = getComputedStyle(wrapper);
            // Sottraiamo il padding per avere l'area effettiva di disegno
            this.width = wrapper.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
            this.height = wrapper.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
            
            // Se le dimensioni sono troppo piccole (es. container nascosto), impostiamo dei default
            if (this.width <= 0) this.width = 900;
            if (this.height <= 0) this.height = 500;
        } else {
            this.width = 900;
            this.height = 500;
        }
        console.log(`Dimensions calculated: ${this.width}x${this.height}`);
    }
    
    // Crea scale
    createScales() {
        // Area di disegno (escludendo i margini)
        const innerWidth = this.width - this.margin.left - this.margin.right;
        const innerHeight = this.height - this.margin.top - this.margin.bottom;
        
        console.log(`Inner dimensions: ${innerWidth}x${innerHeight}`);
        
        this.xScale = d3.scaleLinear()
            .range([0, innerWidth]);
        
        this.yScale = d3.scaleBand()
            .range([0, innerHeight])
            .padding(0.2);
        
        // Scala colori per performance
        this.colorScale = d3.scaleSequential()
            .domain([0, 1])
            .interpolator(d3.interpolateRgb(this.colors.low, this.colors.high));
    }
    
    // Crea assi
    createAxes() {
        const innerHeight = this.height - this.margin.top - this.margin.bottom;
        
        // Gruppo asse X
        this.svg.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0, ${innerHeight})`);
        
        // Gruppo asse Y
        this.svg.append('g')
            .attr('class', 'y-axis');
    }

    createTooltip() {
        // Rimuovi tooltip esistenti
        d3.selectAll('.bar-tooltip').remove();
        
        // Crea nuovo tooltip
        this.tooltip = d3.select('body')
            .append('div')
            .attr('class', 'bar-tooltip')
            .style('opacity', 0)
            .style('position', 'absolute')
            .style('background', 'white')
            .style('padding', '10px')
            .style('border-radius', '5px')
            .style('box-shadow', '0 2px 10px rgba(0,0,0,0.2)')
            .style('pointer-events', 'none')
            .style('z-index', '1000')
            .style('font-family', 'Arial, sans-serif')
            .style('font-size', '12px');
    }
    
    // Aggiorna chart
    updateChart() {
        if (!this.currentBenchmark || !this.benchmarkData[this.currentBenchmark]) return;
        
        // 1. Calcola dimensioni
        this.calculateDimensions();
        
        // 2. Assicura che l'SVG esista (ma non lo ricrea se c'è già)
        this.createSVG();

        if (!this.xScale || !this.yScale) {
            this.createScales();
            this.createAxes();
        }

        // Prepara dati
        this.prepareData();
        
        // Aggiorna scale
        this.updateScales();
        
        // Aggiorna assi
        this.updateAxes();
        
        // Disegna bars
        this.drawBars();
        
        // Aggiorna statistiche
        this.updateStats();
        
        // Aggiorna legenda colori
        this.updateColorLegend();
    }
    
    // Prepara dati
    prepareData() {
        const benchmark = this.benchmarkData[this.currentBenchmark];
        if (!benchmark) return;

        let rawScores = benchmark.models || benchmark.scores || [];

        // Se è un oggetto, trasformalo in array
        if (!Array.isArray(rawScores)) {
            rawScores = Object.entries(rawScores).map(([id, val]) => {
                if (typeof val === 'object') return { ...val, modelId: id };
                return { modelId: id, score: val };
            });
        }

        this.currentData = rawScores.map(d => {
            // Cerca l'ID del modello (potrebbe essere in campi diversi a seconda del CSV)
            const mId = d.modelId || d.model || d.Model || d.name;
            const modelInfo = this.models[mId] || {};
            
            // Estrai il punteggio numerico
            const sValue = parseFloat(d.score || d.Score || d.value || 0);

            return {
                modelId: mId,
                score: sValue,
                modelName: modelInfo.name || mId || "Unknown Model", 
                organization: modelInfo.organization || "N/A",
                normalizedScore: this.normalizeScoreForBenchmark(sValue, this.currentBenchmark)
            };
        })
        .filter(d => d.modelId); // Rimuovi dati corrotti

        // Ordinamento
        if (this.sortOrder === 'score-desc') {
            this.currentData.sort((a, b) => b.score - a.score);
        } else if (this.sortOrder === 'score-asc') {
            this.currentData.sort((a, b) => a.score - b.score);
        }

        if (this.showTopModelsOnly) {
            this.currentData = this.currentData.slice(0, this.maxModelsToShow);
        }
    }
    
    // Normalizza punteggio per benchmark
    normalizeScoreForBenchmark(score, benchmarkId) {
        if (benchmarkId === 'eci') {
            return Math.min(score / 200, 1);
        }
        return Math.min(score / 100, 1); // Assumendo che la maggior parte siano percentuali
    }
    
    // Ordina dati
    sortData(dataArray) {
        switch (this.sortOrder) {
            case 'score-desc':
                dataArray.sort((a, b) => b.score - a.score);
                break;
            case 'score-asc':
                dataArray.sort((a, b) => a.score - b.score);
                break;
            case 'name-asc':
                dataArray.sort((a, b) => a.modelName.localeCompare(b.modelName));
                break;
            case 'name-desc':
                dataArray.sort((a, b) => b.modelName.localeCompare(a.modelName));
                break;
        }
    }
    
    // Aggiorna scale
    updateScales() {
        if (this.currentData.length === 0) return;

        const maxScore = d3.max(this.currentData, d => d.score) || 100;
        const innerWidth = this.width - this.margin.left - this.margin.right;
        
        // Assicurati che il dominio non sia [0, 0]
        this.xScale.domain([0, maxScore * 1.1]).range([0, innerWidth]);
        this.yScale.domain(this.currentData.map(d => d.modelName));
        
        // Usa una scala lineare semplice per i colori per evitare il nero
        this.colorScale = d3.scaleLinear()
            .domain([0, 0.5, 1])
            .range([this.colors.low, this.colors.medium, this.colors.high]);
    }
    
    // Aggiorna assi
    updateAxes() {
        // Aggiorna asse X
        this.svg.select('.x-axis')
            .transition()
            .duration(500)
            .call(d3.axisBottom(this.xScale)
                .ticks(10)
                .tickFormat(d => d.toFixed(1)));
        
        // Aggiorna asse Y
        this.svg.select('.y-axis')
            .transition()
            .duration(500)
            .call(d3.axisLeft(this.yScale));
        
        // Ruota etichette asse Y se necessario
        this.svg.selectAll('.y-axis text')
            .style('text-anchor', 'end')
            .attr('dx', '-0.5em')
            .attr('dy', '0.15em');
    }
    
    // Disegna bars
    drawBars() {
        const bars = this.svg.selectAll('.bar')
            .data(this.currentData, d => d.modelId);
        
        // Rimuovi bars vecchie
        bars.exit()
            .transition()
            .duration(300)
            .attr('width', 0)
            .remove();
        
        // Aggiorna bars esistenti
        bars.transition()
            .duration(500)
            .attr('x', 0)
            .attr('y', d => this.yScale(d.modelName))
            .attr('width', d => this.xScale(d.score))
            .attr('height', this.yScale.bandwidth())
            .attr('fill', d => this.colorScale(d.normalizedScore));
        
        // Aggiungi nuove bars
        const newBars = bars.enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', 0)
            .attr('y', d => this.yScale(d.modelName))
            .attr('width', 0)
            .attr('height', this.yScale.bandwidth())
            .attr('fill', d => this.colorScale(d.normalizedScore))
            .attr('rx', 4);
            // .attr('ry', 3);

        const allBars = newBars.merge(bars);
        
        // Animazione entrata
        newBars.transition()
            .duration(500)
            .attr('width', d => this.xScale(d.score));
        
        // Eventi mouse
        allBars.on('mouseover', (event, d) => {
            const benchmarkName = this.benchmarkData[this.currentBenchmark]?.name || this.currentBenchmark;
        
        this.tooltip.transition().duration(200).style('opacity', .9);
        this.tooltip.html(`
            <div style="color: #333; font-weight: bold; border-bottom: 1px solid #eee; margin-bottom: 5px; padding-bottom: 3px;">
                ${d.modelName}
            </div>
            <div style="color: #666;"><strong>Org:</strong> ${d.organization}</div>
            <div style="color: #666;"><strong>Score:</strong> ${d.score.toLocaleString()}</div>
            <div style="color: #666;"><strong>Test:</strong> ${benchmarkName}</div>
        `)
        .style('left', (event.pageX + 15) + 'px')
        .style('top', (event.pageY - 28) + 'px');
        
        d3.select(event.currentTarget).style('opacity', 0.8);
        })
        .on('mousemove', (event) => {
            this.tooltip
                .style('left', (event.pageX + 15) + 'px')
                .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', (event) => {
            this.tooltip.transition()
                .duration(500)
                .style('opacity', 0);
            
            d3.select(event.currentTarget)
                .style('opacity', 1)
                .style('stroke', 'none');
        });
        
        // // Etichette sui bars (opzionale)
        // const labels = this.svg.selectAll('.bar-label')
        //     .data(this.currentData, d => d.modelId);
        
        // labels.exit().remove();
        
        // labels.enter()
        //     .append('text')
        //     .attr('class', 'bar-label')
        //     .attr('x', d => this.xScale(d.score) + 5)
        //     .attr('y', d => this.yScale(d.modelName) + this.yScale.bandwidth() / 2)
        //     .attr('dy', '0.35em')
        //     .style('font-size', '11px')
        //     .style('fill', '#333')
        //     .text(d => d.score.toFixed(2));
    }
    
    // Aggiorna statistiche
    updateStats() {
        if (this.currentData.length === 0) return;
        
        const scores = this.currentData.map(d => d.score);
        const maxScore = Math.max(...scores);
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        const benchmarkName = this.benchmarkData[this.currentBenchmark].name;
        
        document.getElementById('stat-models-count').textContent = this.currentData.length;
        document.getElementById('stat-highest-score').textContent = maxScore.toFixed(3);
        document.getElementById('stat-avg-score').textContent = avgScore.toFixed(3);
        document.getElementById('stat-benchmark-name').textContent = benchmarkName;
    }
    
    // Aggiorna legenda colori
    updateColorLegend() {
        const gradientBar = document.querySelector('.gradient-bar');
        if (gradientBar) {
            gradientBar.style.background = `linear-gradient(to right, ${this.colors.low}, ${this.colors.medium}, ${this.colors.high})`;
        }
    }
    
    // Ridimensiona al resize della finestra
    handleResize() {
        const wrapper = document.querySelector('.bar-chart-wrapper');
        if (wrapper) {
            const style = getComputedStyle(wrapper);
            this.width = wrapper.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
            this.height = wrapper.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
            
            const svgElement = document.getElementById('barChartSvg');
            if (svgElement) {
                svgElement.setAttribute('viewBox', `0 0 ${this.width} ${this.height}`);
            }
            
            if (this.currentBenchmark) {
                this.updateChart();
            }
        }
    }
}

// Inizializzazione
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing bar chart...');
    
    if (typeof d3 === 'undefined') {
        console.error('D3.js is not loaded');
        return;
    }
    
    // Funzione per inizializzare bar chart
    function initBarChart() {
        const polarChartInstance = window.polarChartInstance;
        
        if (polarChartInstance && polarChartInstance.benchmarkData && 
            Object.keys(polarChartInstance.benchmarkData).length > 0) {
            
            console.log('Polar chart data available, initializing bar chart...');
            
            const barChart = new BarChartD3('bar-chart-1');
            barChart.initFromPolarData(
                polarChartInstance.benchmarkData, 
                polarChartInstance.models
            );
            
            // Salva riferimento globale
            window.barChartInstance = barChart;
            
        } else {
            // Ritenta dopo 500ms
            console.log('Polar chart data not ready yet, retrying...');
            setTimeout(initBarChart, 500);
        }
    }
    
    // Inizia dopo un breve delay per assicurarsi che il DOM sia pronto
    setTimeout(initBarChart, 100);
});