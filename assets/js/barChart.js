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
        this.width = 800;
        this.height = 500;
        
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
        this.benchmarkData = benchmarkData;
        this.models = models;
        this.initializeUI();
        this.populateBenchmarkSelect();
    }
    
    // Inizializza UI
    initializeUI() {
        // Calcola dimensioni dal wrapper
        const wrapper = document.querySelector('.bar-chart-wrapper');
        if (wrapper) {
            const style = getComputedStyle(wrapper);
            this.width = wrapper.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
            this.height = wrapper.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
        }
        
        // Crea SVG
        this.createSVG();
        
        // Aggiungi event listeners
        document.getElementById('barBenchmarkSelect').addEventListener('change', (e) => {
            this.currentBenchmark = e.target.value;
            this.updateChart();
        });
        
        document.getElementById('barModelSort').addEventListener('change', (e) => {
            this.sortOrder = e.target.value;
            this.updateChart();
        });
        
        // Seleziona primo benchmark disponibile
        const select = document.getElementById('barBenchmarkSelect');
        if (select.options.length > 1) {
            this.currentBenchmark = select.options[1].value;
            select.value = this.currentBenchmark;
            this.updateChart();
        }
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
    }
    
    // Crea SVG
    createSVG() {
        const svgElement = document.getElementById('barChartSvg');
        if (!svgElement) return;
        
        // Imposta dimensioni SVG
        svgElement.setAttribute('width', '100%');
        svgElement.setAttribute('height', '100%');
        svgElement.setAttribute('viewBox', `0 0 ${this.width} ${this.height}`);
        svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        
        // Crea gruppo principale
        this.svg = d3.select(svgElement)
            .append('g')
            .attr('transform', `translate(${this.margin.left}, ${this.margin.top})`);
        
        // Crea scale
        this.createScales();
        
        // Crea assi
        this.createAxes();
    }
    
    // Crea scale
    createScales() {
        this.xScale = d3.scaleLinear()
            .range([0, this.width - this.margin.left - this.margin.right]);
        
        this.yScale = d3.scaleBand()
            .range([0, this.height - this.margin.top - this.margin.bottom])
            .padding(0.2);
        
        // Scala colori per performance
        this.colorScale = d3.scaleSequential()
            .domain([0, 1])
            .interpolator(d3.interpolateRgb(this.colors.low, this.colors.high));
    }
    
    // Crea assi
    createAxes() {
        // Gruppo asse X
        this.svg.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0, ${this.height - this.margin.top - this.margin.bottom})`);
        
        // Gruppo asse Y
        this.svg.append('g')
            .attr('class', 'y-axis');
        
        // Etichetta asse X
        this.svg.append('text')
            .attr('class', 'axis-label')
            .attr('x', (this.width - this.margin.left - this.margin.right) / 2)
            .attr('y', this.height - this.margin.top - this.margin.bottom + 40)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('fill', '#333')
            .text('Score');
        
        // Etichetta asse Y
        this.svg.append('text')
            .attr('class', 'axis-label')
            .attr('transform', 'rotate(-90)')
            .attr('x', -(this.height - this.margin.top - this.margin.bottom) / 2)
            .attr('y', -this.margin.left + 15)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('fill', '#333')
            .text('AI Models');
    }
    
    // Aggiorna chart
    updateChart() {
        if (!this.currentBenchmark || !this.benchmarkData[this.currentBenchmark]) return;
        
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
        
        // Ottieni tutti i dati validi
        let allData = benchmark.scores
            .map(item => {
                const model = this.models[item.modelId];
                if (!model) return null;
                
                return {
                    modelId: item.modelId,
                    modelName: model.name || item.modelId,
                    organization: model.organization || 'Unknown',
                    country: model.country || 'Unknown',
                    score: parseFloat(item.score),
                    normalizedScore: this.normalizeScoreForBenchmark(item.score, this.currentBenchmark)
                };
            })
            .filter(item => item && !isNaN(item.score));
        
        // Ordina prima di limitare
        this.sortData(allData);
        
        // Prendi solo i top N (dopo aver ordinato)
        if (allData.length > this.maxModelsToShow) {
            // Se l'utente ha selezionato ordine per nome, prendi i primi N alfabeticamente
            // Se ha selezionato ordine per punteggio, prendi i top N per punteggio
            this.currentData = allData.slice(0, this.maxModelsToShow);
        } else {
            this.currentData = allData;
        }
    
        console.log(`Sorted by ${this.sortOrder}, showing ${this.currentData.length} models`);
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
        // Scala X basata sul punteggio massimo
        const maxScore = d3.max(this.currentData, d => d.score);
        this.xScale.domain([0, maxScore * 1.1]); // +10% per spazio
        
        // Scala Y basata sui nomi dei modelli
        this.yScale.domain(this.currentData.map(d => d.modelName));
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
            .attr('rx', 3)
            .attr('ry', 3);
        
        // Animazione entrata
        newBars.transition()
            .duration(500)
            .attr('width', d => this.xScale(d.score));
        
        // Tooltip
        const tooltip = d3.select('body').append('div')
            .attr('class', 'bar-tooltip')
            .style('opacity', 0)
            .style('position', 'absolute')
            .style('background', 'white')
            .style('padding', '10px')
            .style('border-radius', '5px')
            .style('box-shadow', '0 2px 10px rgba(0,0,0,0.2)')
            .style('pointer-events', 'none')
            .style('z-index', '1000');
        
        // Eventi mouse
        this.svg.selectAll('.bar')
            .on('mouseover', (event, d) => {
                tooltip.transition()
                    .duration(200)
                    .style('opacity', .9);
                tooltip.html(`
                    <strong>${d.modelName}</strong><br/>
                    <strong>Score:</strong> ${d.score.toFixed(3)}<br/>
                    <strong>Organization:</strong> ${d.organization}<br/>
                    <strong>Benchmark:</strong> ${this.benchmarkData[this.currentBenchmark].name}
                `)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 28) + 'px');
                
                d3.select(event.currentTarget)
                    .style('opacity', 0.8)
                    .style('stroke', '#333')
                    .style('stroke-width', '2px');
            })
            .on('mouseout', (event) => {
                tooltip.transition()
                    .duration(500)
                    .style('opacity', 0);
                
                d3.select(event.currentTarget)
                    .style('opacity', 1)
                    .style('stroke', 'none');
            });
        
        // Etichette sui bars (opzionale)
        const labels = this.svg.selectAll('.bar-label')
            .data(this.currentData, d => d.modelId);
        
        labels.exit().remove();
        
        labels.enter()
            .append('text')
            .attr('class', 'bar-label')
            .attr('x', d => this.xScale(d.score) + 5)
            .attr('y', d => this.yScale(d.modelName) + this.yScale.bandwidth() / 2)
            .attr('dy', '0.35em')
            .style('font-size', '11px')
            .style('fill', '#333')
            .text(d => d.score.toFixed(2));
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
    if (typeof d3 === 'undefined') {
        console.error('D3.js is not loaded');
        return;
    }
    
    // Aspetta che il polar chart carichi i dati
    setTimeout(() => {
        // Cerca dati dal polar chart se esistono
        const polarChartInstance = window.polarChartInstance;
        if (polarChartInstance && polarChartInstance.benchmarkData) {
            const barChart = new BarChartD3('bar-chart-1');
            barChart.initFromPolarData(polarChartInstance.benchmarkData, polarChartInstance.models);
            
            // Salva riferimento globale
            window.barChartInstance = barChart;
            
            // Gestisci resize
            window.addEventListener('resize', () => {
                barChart.handleResize();
            });
        } else {
            console.warn('Polar chart data not available yet, retrying...');
            // Potresti implementare un sistema di eventi o polling
        }
    }, 2000); // Aspetta 2 secondi che il polar chart carichi
});