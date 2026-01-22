
class PolarChartD3 {
    constructor(containerId) {
        this.containerId = containerId;
        this.benchmarkData = {};
        this.models = {};
        this.benchmarkFiles = [
            'chess_puzzles.csv',
            'frontiermath.csv',
            'frontiermath_tier_4.csv',
            'gpqa_diamond.csv',
            'math_level_5.csv',
            'otis_mock_aime_2024_2025.csv',
            'simpleqa_verified.csv',
            'swe_bench_verified.csv',
            'metr_time_horizons_external.csv',
            'epoch_capabilities_index.csv'
        ];
        
        this.benchmarkConfig = {
            'chess_puzzles.csv': { id: 'chess', name: 'Chess Puzzles', scoreKey: 'mean_score' },
            'frontiermath.csv': { id: 'frontiermath', name: 'FrontierMath', scoreKey: 'mean_score' },
            'frontiermath_tier_4.csv': { id: 'frontiermath_t4', name: 'FrontMath Tier4', scoreKey: 'mean_score' },
            'gpqa_diamond.csv': { id: 'gpqa', name: 'GPQA Diamond', scoreKey: 'mean_score' },
            'math_level_5.csv': { id: 'math5', name: 'Math Level 5', scoreKey: 'mean_score' },
            'otis_mock_aime_2024_2025.csv': { id: 'otis', name: 'OTIS AIME', scoreKey: 'mean_score' },
            'simpleqa_verified.csv': { id: 'simpleqa', name: 'SimpleQA', scoreKey: 'mean_score' },
            'swe_bench_verified.csv': { id: 'swe', name: 'SWE Bench', scoreKey: 'mean_score' },
            'metr_time_horizons_external.csv': { id: 'metr', name: 'METR Time', scoreKey: 'average_score' },
            'epoch_capabilities_index.csv': { id: 'eci', name: 'ECI Score', scoreKey: 'ECI Score' }
        };

        this.topNModels = 20; // Mostra i 20 modelli con più benchmark

        // this.minBenchmarksRequired = 6;
        this.currentModel = null;
        this.dataLoaded = false;
        this.svg = null;

        this.width = 0;
        this.height = 0;

        this.selectElement = null;
        this.modelInfoElement = null;
        this.svgElement = null;

        this.chartWrapper = null;
        // Colori per i benchmark
        this.colorScale = d3.scaleOrdinal()
            .domain(['chess', 'frontiermath', 'frontiermath_t4', 'gpqa', 'math5', 'otis', 'simpleqa', 'swe', 'metr', 'eci'])
            .range([
                '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', 
                '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3', '#ff9f43'
            ]);
            
    }
        
    // Nuovo metodo per calcolare dimensioni
    calculateDimensions() {
        // Trova il wrapper del grafico
        this.chartWrapper = document.querySelector('.chart-wrapper');
        
        if (!this.chartWrapper) {
            console.warn('Chart wrapper not found, using default dimensions');
            this.width = 800;
            this.height = 600;
            return;
        }
        
        // Ottieni dimensioni del wrapper (escludendo padding)
        const style = window.getComputedStyle(this.chartWrapper);
        const wrapperWidth = this.chartWrapper.clientWidth 
            - parseFloat(style.paddingLeft) 
            - parseFloat(style.paddingRight);
        
        const wrapperHeight = this.chartWrapper.clientHeight 
            - parseFloat(style.paddingTop) 
            - parseFloat(style.paddingBottom);
        
        // Dimensioni dell'SVG = dimensioni del wrapper
        this.width = Math.max(wrapperWidth, 600); // Minimo 600px
        this.height = Math.max(wrapperHeight, 400); // Minimo 400px
        
        console.log(`SVG Dimensions: ${this.width}x${this.height}px`);
        
        // Ricalcola le dimensioni interne
        this.margin = { 
            top: Math.max(40, this.height * 0.08), 
            right: Math.max(80, this.width * 0.12), 
            bottom: Math.max(40, this.height * 0.08), 
            left: Math.max(80, this.width * 0.12) 
        };   

        // this.margin = { top: 60, right: 100, bottom: 60, left: 100 };

        this.innerWidth = this.width - this.margin.left - this.margin.right;
        this.innerHeight = this.height - this.margin.top - this.margin.bottom;
        this.radius = Math.min(this.innerWidth, this.innerHeight) / 2;
        
    }

    // Carica un file CSV
    async loadCSV(filePath) {
        try {
            const data = await d3.csv(filePath);            return data;
        } catch (error) {
            console.error(`Error loading CSV ${filePath}:`, error);
            return null;
        }
    }

    // Carica tutti i dati
    async loadAllData() {
        const loadingPromises = this.benchmarkFiles.map(async (fileName) => {
            const config = this.benchmarkConfig[fileName];
            if (!config) return;

            const dataPath = `../data/benchmark_data/${fileName}`;

            const data = await this.loadCSV(dataPath);

            if (data) {
                this.processBenchmarkData(data, config);
            }
        });
        
        await Promise.all(loadingPromises);
        this.dataLoaded = true;
        this.initializeUI();
    }

    // Processa i dati del benchmark
    processBenchmarkData(data, config) {

        if (!data || !Array.isArray(data)) {
            console.error('Invalid data passed to processBenchmarkData:', data);
            return;
        }
    
        console.log(`Processing ${config.name}, ${data.length} rows`);

        data.forEach((row, index) => {
            const modelVersion = row['Model version'];
            const score = parseFloat(row[config.scoreKey]);

            const modelId = this.normalizeModelId(modelVersion);


                
            if (!this.models[modelId]) {
                this.models[modelId] = {
                    id: modelId,
                    name: this.extractModelName(modelVersion),
                    version: modelVersion,
                    organization: row['Organization'] || 'Unknown',
                    country: row['Country'] || 'Unknown',
                    releaseDate: row['Release date'] || 'Unknown',
                    scores: {},
                    benchmarkCount: 0
                };
            }

            if(this.models[modelId].scores[config.id]===undefined){
                this.models[modelId].benchmarkCount++;
                console.log(`  Incremented benchmarkCount for ${modelId}: now ${this.models[modelId].benchmarkCount}`);
            }
            
            this.models[modelId].scores[config.id] = score;
            
            if (!this.benchmarkData[config.id]) {
                this.benchmarkData[config.id] = {
                    id: config.id,
                    name: config.name,
                    scores: []
                };
            }
            
            this.benchmarkData[config.id].scores.push({
                modelId: modelId,
                score: score
            });
            
        });
        console.log(`Finished processing ${config.name}`);
    }

    normalizeModelId(modelVersion) {
        if (!modelVersion || typeof modelVersion !== 'string') {
            console.warn('normalizeModelId: invalid input', modelVersion);
            return 'unknown_model';
        }
        // 2. Trim e lowercase
    let normalized = modelVersion.trim().toLowerCase();
    
    // 3. Gestione casi speciali (es: "gemini3flashpreview")
    // Aggiungi underscore tra numeri e lettere
    normalized = normalized
        .replace(/(\d)([a-z])/g, '$1_$2')   // numero seguito da lettera: 3f → 3_f
        .replace(/([a-z])(\d)/g, '$1_$2');  // lettera seguita da numero: i3 → i_3
    
    // 4. Sostituzione caratteri speciali
    normalized = normalized
        .replace(/[\/\\:.,]/g, '_')          // sostituisce / \ : . , con _
        .replace(/\s+/g, '_')                // spazi multipli con _
        .replace(/[^a-z0-9_]/g, '')          // rimuove caratteri non alfanumerici o _
        .replace(/_+/g, '_')                 // riduce underscore multipli
        .replace(/^_+|_+$/g, '');            // rimuove underscore all'inizio/fine
    
    // 5. Se è vuoto, ritorna un default
    if (normalized === '') {
        console.warn('normalizeModelId: empty result from', modelVersion);
        return 'empty_model_' + Math.random().toString(36).substr(2, 5);
    }
    
    return normalized;
    }

    extractModelName(modelVersion) {
        if (!modelVersion || typeof modelVersion !== 'string') {
            return 'Unknown Model';
        }
    
        const parts = modelVersion.split('/');
        const lastPart = parts[parts.length - 1];
        
        return lastPart
            .replace(/[-_]?\d{4}-\d{2}-\d{2}.*$/, '')
            .replace(/[-_](high|medium|low|pro|preview|turbo|flash)$/i, '')
            .replace(/_/g, ' ')
            .trim();
    }

    // Normalizza punteggio 0-1
    normalizeScore(score, benchmarkId) {
        if (benchmarkId === 'eci') {
            return Math.min(score / 200, 1);
        }
        return Math.min(score, 1);
    }


    initializeUI() {
        // Riferimenti agli elementi esistenti
        this.selectElement = document.getElementById('polarModelSelect');
        this.modelInfoElement = document.getElementById('polarModelInfo');
        this.svgElement = document.getElementById('polarChartSvg');
        
        if (!this.selectElement || !this.modelInfoElement || !this.svgElement) {
            console.error('Required HTML elements not found');
            return;
        }
        
        // Pulisci il select (rimuove "Loading models...")
        this.selectElement.innerHTML = '';
        
        this.populateModelSelect();
        this.createSVG();
        this.addResizeListener();
        
        // Seleziona il primo modello disponibile
        if (this.selectElement.options.length > 0) {
            this.currentModel = this.selectElement.value;
            this.updateChart(this.currentModel);
        }
        
        // Aggiungi event listener
        this.selectElement.addEventListener('change', (e) => {
            this.currentModel = e.target.value;
            this.updateChart(this.currentModel);
        });
    }

   
    populateModelSelect() {
        if (!this.selectElement) return;
        
        // Ordina i modelli per numero di benchmark (discendente)
        const sortedModels = Object.values(this.models)
            .sort((a, b) => b.benchmarkCount - a.benchmarkCount)  // Dal più al meno
            .slice(0, this.topNModels);  // Prende solo i primi 20
        
        console.log(`Showing top ${sortedModels.length} models with most benchmarks`);
        
        if (sortedModels.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No models available';
            option.disabled = true;
            this.selectElement.appendChild(option);
            return;
        }
        
        // Aggiungi le opzioni
        sortedModels.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            
            // Formatta il testo dell'opzione
            let displayText = model.name;
            if (model.organization && model.organization !== 'Unknown') {
                displayText += ` (${model.organization})`;
            }
            if (model.benchmarkCount < 10) {
                displayText += ` [${model.benchmarkCount}/10]`;
            }
            
            option.textContent = displayText;
            this.selectElement.appendChild(option);
        });
        
        // Mostra statistiche in console
        console.log('Model benchmark counts:');
        sortedModels.forEach(model => {
            console.log(`  ${model.name}: ${model.benchmarkCount} benchmarks`);
        });
    }

    createSVG() {
        // Calcola dimensioni prima di creare l'SVG
        this.calculateDimensions();

        // Seleziona o crea l'SVG
        let svgElement = document.getElementById('polarChartSvg');

        if (!svgElement) {
            // Crea SVG se non esiste
            svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svgElement.id = 'polarChartSvg';
            this.chartWrapper.appendChild(svgElement);
        }

        // Imposta dimensioni dell'SVG
        svgElement.setAttribute('width', '100%');
        svgElement.setAttribute('height', '100%');
        svgElement.setAttribute('viewBox', `0 0 ${this.width} ${this.height}`);
        svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');

        // Crea gruppo principale con D3
        this.svg = d3.select(svgElement)
            .append('g')
            .attr('transform', `translate(${this.margin.left + this.innerWidth/2}, ${this.margin.top + this.innerHeight/2})`);
    }

    // Aggiungi resize handler
    addResizeListener() {
        window.addEventListener('resize', () => {
            if (this.currentModel) {
                this.calculateDimensions();
                this.updateChart(this.currentModel);
            }
        });
    }

    // Aggiorna il grafico
    updateChart(modelId) {
        if (!this.svg || !this.models[modelId]) return;
        
        const model = this.models[modelId];
        const chartData = this.getChartData(modelId);
        
        // Pulisci SVG
        this.svg.selectAll('*').remove();
        
        // Crea scale
        const angleScale = d3.scaleLinear()
            .domain([0, chartData.labels.length])
            .range([0, Math.PI * 2]);
        
        const radialScale = d3.scaleLinear()
            .domain([0, 1])
            .range([0, this.radius]);
        
        // Crea griglia polare
        this.createPolarGrid(radialScale);
        
        // Crea assi (linee radiali)
        this.createRadialAxes(chartData.labels, angleScale, radialScale);
        
        // Crea area polare
        this.createPolarArea(chartData, angleScale, radialScale);
        
        // Crea punti dati
        this.createDataPoints(chartData, angleScale, radialScale);
        
        // Aggiorna info
        this.updateModelInfo(model);
        
        // Aggiungi legenda
        this.createLegend(chartData);
    }

    // Crea griglia polare
    createPolarGrid(radialScale) {
        const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];
        
        gridLevels.forEach(level => {
            this.svg.append('circle')
                .attr('cx', 0)
                .attr('cy', 0)
                .attr('r', radialScale(level))
                .attr('fill', 'none')
                .attr('stroke', '#e0e0e0')
                .attr('stroke-width', 1)
                .attr('stroke-dasharray', '2,2');
            
            // Etichette livello
            this.svg.append('text')
                .attr('x', 0)
                .attr('y', -radialScale(level) - 5)
                .attr('text-anchor', 'middle')
                .attr('fill', '#666')
                .attr('font-size', '10px')
                .text(level.toFixed(1));
        });
    }

    // Crea assi radiali
    createRadialAxes(labels, angleScale, radialScale) {
        labels.forEach((label, i) => {
            const angle = angleScale(i);
            const x = radialScale(1.1) * Math.sin(angle);
            const y = -radialScale(1.1) * Math.cos(angle);
            
            // Linea asse
            this.svg.append('line')
                .attr('x1', 0)
                .attr('y1', 0)
                .attr('x2', radialScale(1) * Math.sin(angle))
                .attr('y2', -radialScale(1) * Math.cos(angle))
                .attr('stroke', '#ccc')
                .attr('stroke-width', 1);
            
            // Etichetta asse
            this.svg.append('text')
                .attr('x', x)
                .attr('y', y)
                .attr('text-anchor', 'middle')
                .attr('alignment-baseline', 'middle')
                .attr('fill', '#333')
                .attr('font-size', '11px')
                .attr('font-weight', 'bold')
                .text(label);
        });
    }

    // Crea area polare
    createPolarArea(chartData, angleScale, radialScale) {
        const lineGenerator = d3.lineRadial()
            .angle((d, i) => angleScale(i))
            .radius(d => radialScale(d))
            .curve(d3.curveLinearClosed);
        
        this.svg.append('path')
            .datum(chartData.scores)
            .attr('d', lineGenerator)
            .attr('fill', 'rgba(66, 133, 244, 0.2)')
            .attr('stroke', '#4285f4')
            .attr('stroke-width', 2)
            .attr('stroke-opacity', 0.8);
    }

    // Crea punti dati
    createDataPoints(chartData, angleScale, radialScale) {
        const points = this.svg.selectAll('.data-point')
            .data(chartData.scores)
            .enter()
            .append('g')
            .attr('class', 'data-point');
        
        points.append('circle')
            .attr('cx', (d, i) => radialScale(d) * Math.sin(angleScale(i)))
            .attr('cy', (d, i) => -radialScale(d) * Math.cos(angleScale(i)))
            .attr('r', 4)
            .attr('fill', (d, i) => this.colorScale(chartData.benchmarkIds[i]))
            .attr('stroke', '#fff')
            .attr('stroke-width', 2);
        
        // Tooltip
        points.append('title')
            .text((d, i) => `${chartData.labels[i]}: ${d.toFixed(3)}`);
    }

    // Crea legenda
    createLegend(chartData) {
        this.svg.selectAll('.legend').remove();

        const legend = this.svg.append('g')
        .attr('class', 'legend')
            .attr('transform', `translate(${this.radius + 180},${this.radius - 280})`);
        
        const legendItems = legend.selectAll('.legend-item')
            .data(chartData.labels)
            .enter()
            .append('g')
            .attr('class', 'legend-item')
            .attr('transform', (d, i) => `translate(0, ${-this.radius + 40 + i * 25})`);
        
        legendItems.append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', 15)
            .attr('height', 15)
            .attr('fill', (d, i) => this.colorScale(chartData.benchmarkIds[i]));
        
        legendItems.append('text')
            .attr('x', 20)
            .attr('y', 10)
            .attr('font-size', '12px')
            .attr('fill', '#333')
            .attr('alignment-baseline', 'middle')
            .text(d => d);
    }

    // Ottiene dati per il grafico
    getChartData(modelId) {
        const model = this.models[modelId];
        if (!model) return { labels: [], scores: [], benchmarkIds: [] };
        
        const labels = [];
        const scores = [];
        const benchmarkIds = [];
        
        Object.keys(this.benchmarkData).forEach(benchmarkId => {
            const benchmark = this.benchmarkData[benchmarkId];
            if (model.scores[benchmarkId] !== undefined) {
                labels.push(benchmark.name);
                scores.push(this.normalizeScore(model.scores[benchmarkId], benchmarkId));
                benchmarkIds.push(benchmarkId);
            }
        });
        
        return { labels, scores, benchmarkIds };
    }
    // Aggiorna info modello - Versione con elementi HTML esistenti
updateModelInfo(model) {
    if (!this.modelInfoElement) return;
    
    const benchmarkCount = Object.keys(model.scores).length;
    const totalScore = Object.values(model.scores).reduce((sum, score) => sum + score, 0);
    const avgScore = benchmarkCount > 0 ? (totalScore / benchmarkCount).toFixed(2) : 'N/A';
    
    // Calcola punteggio normalizzato medio
    const normalizedScores = Object.entries(model.scores).map(([benchmarkId, score]) => 
        this.normalizeScore(score, benchmarkId)
    );
    const avgNormalizedScore = normalizedScores.length > 0 
        ? (normalizedScores.reduce((a, b) => a + b, 0) / normalizedScores.length).toFixed(3)
        : 'N/A';
    
    // ✅ Aggiorna gli elementi HTML esistenti invece di usare innerHTML
    // Nome del modello
    const nameElement = this.modelInfoElement.querySelector('.model-name');
    if (nameElement) nameElement.textContent = model.name;
    
    // Organizzazione
    const orgElement = document.getElementById('model-organization');
    if (orgElement) orgElement.textContent = model.organization;
    
    // Versione
    const versionElement = document.getElementById('model-version');
    if (versionElement) versionElement.textContent = model.version;
    
    // Data di rilascio
    const dateElement = document.getElementById('model-releaseDate');
    if (dateElement) dateElement.textContent = model.releaseDate;
    
    // Paese
    const countryElement = document.getElementById('model-country');
    if (countryElement) countryElement.textContent = model.country;
    
    // Numero benchmark
    const countElement = document.getElementById('model-benchmarkCount');
    if (countElement) countElement.textContent = `${benchmarkCount}/10`;
    
    // Punteggio medio
    const avgElement = document.getElementById('model-avgScore');
    if (avgElement) avgElement.textContent = avgScore;
    
    // Punteggio normalizzato
    const normElement = document.getElementById('model-avgNormalizedScore');
    if (normElement) normElement.textContent = avgNormalizedScore;
    
    // Opzionale: aggiungi classe per modelli completi (10/10)
    if (countElement) {
        if (benchmarkCount === 10) {
            countElement.classList.add('complete');
            countElement.classList.remove('partial');
        } else if (benchmarkCount >= 7) {
            countElement.classList.add('partial');
            countElement.classList.remove('complete');
        } else {
            countElement.classList.remove('complete', 'partial');
        }
    }
}

    init() {
        // Verifica che gli elementi HTML necessari esistano
        if (!document.getElementById('polarModelSelect') ||
            !document.getElementById('polarModelInfo') ||
            !document.getElementById('polarChartSvg')) {
            console.error('Required HTML elements not found for polar chart');
            this.showError('HTML structure is incomplete. Please check the page markup.');
            return;
        }
        
        this.loadAllData().catch(error => {
            console.error('Failed to load data:', error);
            this.showError(`Failed to load benchmark data: ${error.message}`);
        });
    }


    showError(message) {
        const container = document.getElementById(this.containerId);
        if (container) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'chart-error';
            errorDiv.innerHTML = `
                <h3>⚠️ Error Loading Chart</h3>
                <p>${message}</p>
                <p>Please check the console for more details.</p>
            `;
            
            // Sostituisce tutto il contenuto del container
            container.innerHTML = '';
            container.appendChild(errorDiv);
        }
    }
}

// Inizializza quando D3.js è caricato
document.addEventListener('DOMContentLoaded', () => {
    // Verifica che D3.js sia caricato
    if (typeof d3 === 'undefined') {
        console.error('D3.js is not loaded. Please include D3.js library.');
        return;
    }
    
    const polarContainers = document.querySelectorAll('.polar-chart-container');
    polarContainers.forEach(container =>{
        const chart = new PolarChartD3(container.id);
        chart.init();
    })
});

// Supporto ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PolarChartD3;
}