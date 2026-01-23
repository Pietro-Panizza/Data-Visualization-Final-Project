class PolarChartD3 {
    constructor(containerId) {
        this.containerId = containerId;
        this.benchmarkData = {};
        this.models = {};
        this.benchmarkFiles = [
            'chess_puzzles.csv',
            'frontiermath.csv',
            'gpqa_diamond.csv',
            'simplebench_externals.csv',
            'deepresearchbench_externals.csv',
            'otis_mock_aime_2024_2025.csv',
            'simpleqa_verified.csv',
            'swe_bench_verified.csv',
            'metr_time_horizons_external.csv'
        ];
        
        this.benchmarkConfig = {
            'chess_puzzles.csv': { id: 'chess', name: 'Chess Puzzles', scoreKey: 'mean_score' },
            'frontiermath.csv': { id: 'frontiermath', name: 'FrontierMath', scoreKey: 'mean_score' },
            'simplebench_externals.csv': { id: 'simplebench', name: 'SimpleBench', scoreKey: 'mean_score' },
            'gpqa_diamond.csv': { id: 'gpqa', name: 'GPQA Diamond', scoreKey: 'mean_score' },
            'deepresearchbench_externals.csv': { id: 'deepresearch', name: 'DeepResearch', scoreKey: 'mean_score' },
            'otis_mock_aime_2024_2025.csv': { id: 'otis', name: 'OTIS AIME', scoreKey: 'mean_score' },
            'simpleqa_verified.csv': { id: 'simpleqa', name: 'SimpleQA', scoreKey: 'mean_score' },
            'swe_bench_verified.csv': { id: 'swe', name: 'SWE Bench', scoreKey: 'mean_score' },
            'metr_time_horizons_external.csv': { id: 'metr', name: 'METR Time', scoreKey: 'average_score' }
        };

        this.topNModels = 20;
        this.currentModel = null;
        this.dataLoaded = false;
        this.svg = null;

        this.width = 0;
        this.height = 0;

        this.selectElement = null;
        this.modelInfoElement = null;
        this.svgElement = null;

        this.chartWrapper = null;
        
        // Contatori per i modelli speciali
        this.gpt52Count = 0;
        this.gpt5Count = 0;
        this.claude35Count = 0;
        
        // Lista per tracciare i modelli speciali trovati
        this.specialModels = {
            gpt52: [],  // Modelli con "gpt-5.2"
            gpt5: [],   // Modelli con "gpt-5" (senza - o . dopo)
            claude35: [] // Modelli con "claude-3-5"
        };
        
        this.colorScale = d3.scaleOrdinal()
            .domain(['chess', 'frontiermath', 'simplebench', 'gpqa', 'deepresearch', 'otis', 'simpleqa', 'swe', 'metr'])
            .range([
                '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', 
                '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3'
            ]);
    }
    
    // AGGIUNTO: Metodo loadCSV che mancava
    async loadCSV(filePath) {
        try {
            const data = await d3.csv(filePath);
            return data;
        } catch (error) {
            console.error(`Error loading CSV ${filePath}:`, error);
            return null;
        }
    }
    
    // Nuovo metodo per verificare se un modello è speciale e gestire i limiti
    checkAndHandleSpecialModel(modelVersion) {
        const lowerVersion = modelVersion.toLowerCase();
        
        // Controlla per "gpt-5.2"
        if (lowerVersion.includes('gpt-5.2')) {
            this.gpt52Count++;
            this.specialModels.gpt52.push(modelVersion);
            
            // Se superiamo il limite di 2, ignora questo modello
            if (this.gpt52Count > 2) {
                console.log(`⚠️ Limite raggiunto: ignorato modello "${modelVersion}" (${this.gpt52Count} modelli "gpt-5.2" trovati)`);
                return false; // Ignora questo modello
            }
            return true; // Accetta questo modello
        }
        
        // Controlla per "gpt-5" (senza - o . dopo)
        // Usa una regex per catturare "gpt-5" seguito da fine stringa, spazio, o caratteri non -.
        const gpt5Regex = /gpt-5(?![.-])/i;
        if (gpt5Regex.test(lowerVersion)) {
            this.gpt5Count++;
            this.specialModels.gpt5.push(modelVersion);
            
            // Se superiamo il limite di 2, ignora questo modello
            if (this.gpt5Count > 2) {
                console.log(`⚠️ Limite raggiunto: ignorato modello "${modelVersion}" (${this.gpt5Count} modelli "gpt-5" trovati)`);
                return false; // Ignora questo modello
            }
            return true; // Accetta questo modello
        }
        
        // Controlla per "claude-3-5"
        if (lowerVersion.includes('claude-3-5')) {
            this.claude35Count++;
            this.specialModels.claude35.push(modelVersion);
            
            // Se superiamo il limite di 1, ignora questo modello
            if (this.claude35Count > 1) {
                console.log(`⚠️ Limite raggiunto: ignorato modello "${modelVersion}" (${this.claude35Count} modelli "claude-3-5" trovati)`);
                return false; // Ignora questo modello
            }
            return true; // Accetta questo modello
        }
        
        return true; // Tutti gli altri modelli sono accettati
    }
    
    // MODIFICATO: Aggiungi controllo speciali nel metodo processBenchmarkData
    processBenchmarkData(data, config) {
        if (!data || !Array.isArray(data)) {
            console.error('Invalid data passed to processBenchmarkData:', data);
            return;
        }
    
        console.log(`Processing ${config.name}, ${data.length} rows`);
        
        // Log iniziale dei contatori speciali
        console.log(`Contatori speciali iniziali: GPT-5.2=${this.gpt52Count}, GPT-5=${this.gpt5Count}, Claude-3-5=${this.claude35Count}`);

        data.forEach((row, index) => {
            const modelVersion = row['Model version'];
            const score = parseFloat(row[config.scoreKey]);

            // Controlla se il modello è speciale e se supera i limiti
            if (!this.checkAndHandleSpecialModel(modelVersion)) {
                console.log(`Skipping model "${modelVersion}" due to special model limits`);
                return; // Salta questo modello
            }

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

            if (this.models[modelId].scores[config.id] === undefined) {
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
        
        // Log finale dei contatori speciali
        console.log(`Contatori speciali finali per ${config.name}:`);
        console.log(`  GPT-5.2: ${this.gpt52Count} modelli (${this.specialModels.gpt52.join(', ')})`);
        console.log(`  GPT-5: ${this.gpt5Count} modelli (${this.specialModels.gpt5.join(', ')})`);
        console.log(`  Claude-3-5: ${this.claude35Count} modelli (${this.specialModels.claude35.join(', ')})`);
        
        console.log(`Finished processing ${config.name}`);
    }

    // MODIFICATO: Aggiungi resettaggio dei contatori nel loadAllData
    async loadAllData() {
        // Resetta i contatori speciali prima di caricare i dati
        this.gpt52Count = 0;
        this.gpt5Count = 0;
        this.claude35Count = 0;
        this.specialModels = {
            gpt52: [],
            gpt5: [],
            claude35: []
        };
        
        console.log('Starting to load all benchmark data with special model limits:');
        console.log('- Max 2 models with "gpt-5.2"');
        console.log('- Max 2 models with "gpt-5" (without - or . after)');
        console.log('- Max 1 model with "claude-3-5"');
        
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
        
        // Log riepilogativo finale
        console.log('\n=== Riepilogo finale modelli speciali ===');
        console.log(`Totale modelli GPT-5.2: ${this.gpt52Count}`);
        if (this.specialModels.gpt52.length > 0) {
            console.log(`  Modelli: ${this.specialModels.gpt52.join(', ')}`);
        }
        
        console.log(`Totale modelli GPT-5: ${this.gpt5Count}`);
        if (this.specialModels.gpt5.length > 0) {
            console.log(`  Modelli: ${this.specialModels.gpt5.join(', ')}`);
        }
        
        console.log(`Totale modelli Claude-3-5: ${this.claude35Count}`);
        if (this.specialModels.claude35.length > 0) {
            console.log(`  Modelli: ${this.specialModels.claude35.join(', ')}`);
        }
        console.log('=======================================\n');
        
        this.dataLoaded = true;
        this.initializeUI();
    }

    normalizeModelId(modelVersion) {
        if (!modelVersion || typeof modelVersion !== 'string') {
            console.warn('normalizeModelId: invalid input', modelVersion);
            return 'unknown_model';
        }
        
        let normalized = modelVersion.trim().toLowerCase();
        
        normalized = normalized
            .replace(/(\d)([a-z])/g, '$1_$2')
            .replace(/([a-z])(\d)/g, '$1_$2')
            .replace(/[\/\\:.,]/g, '_')
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_]/g, '')
            .replace(/_+/g, '_')
            .replace(/^_+|_+$/g, '');
        
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
        return Math.min(score, 1);
    }

    // Calcola dimensioni
    calculateDimensions() {
        this.chartWrapper = document.querySelector('.chart-wrapper');
        
        if (!this.chartWrapper) {
            console.warn('Chart wrapper not found, using default dimensions');
            this.width = 800;
            this.height = 600;
            return;
        }
        
        const style = window.getComputedStyle(this.chartWrapper);
        const wrapperWidth = this.chartWrapper.clientWidth 
            - parseFloat(style.paddingLeft) 
            - parseFloat(style.paddingRight);
        
        const wrapperHeight = this.chartWrapper.clientHeight 
            - parseFloat(style.paddingTop) 
            - parseFloat(style.paddingBottom);
        
        this.width = Math.max(wrapperWidth, 600);
        this.height = Math.max(wrapperHeight, 400);
        
        console.log(`SVG Dimensions: ${this.width}x${this.height}px`);
        
        this.margin = { 
            top: Math.max(40, this.height * 0.08), 
            right: Math.max(80, this.width * 0.12), 
            bottom: Math.max(40, this.height * 0.08), 
            left: Math.max(80, this.width * 0.12) 
        };   

        this.innerWidth = this.width - this.margin.left - this.margin.right;
        this.innerHeight = this.height - this.margin.top - this.margin.bottom;
        this.radius = Math.min(this.innerWidth, this.innerHeight) / 2;
    }

    initializeUI() {
        this.selectElement = document.getElementById('polarModelSelect');
        this.modelInfoElement = document.getElementById('polarModelInfo');
        this.svgElement = document.getElementById('polarChartSvg');
        
        if (!this.selectElement || !this.modelInfoElement || !this.svgElement) {
            console.error('Required HTML elements not found');
            return;
        }
        
        this.selectElement.innerHTML = '';
        this.populateModelSelect();
        this.createSVG();
        this.addResizeListener();
        
        if (this.selectElement.options.length > 0) {
            this.currentModel = this.selectElement.value;
            this.updateChart(this.currentModel);
        }
        
        this.selectElement.addEventListener('change', (e) => {
            this.currentModel = e.target.value;
            this.updateChart(this.currentModel);
        });
    }

    populateModelSelect() {
        if (!this.selectElement) return;
        
        const sortedModels = Object.values(this.models)
            .sort((a, b) => b.benchmarkCount - a.benchmarkCount)
            .slice(0, this.topNModels);
        
        console.log(`Showing top ${sortedModels.length} models with most benchmarks`);
        
        if (sortedModels.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No models available';
            option.disabled = true;
            this.selectElement.appendChild(option);
            return;
        }
        
        sortedModels.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            
            let displayText = model.name;
            if (model.organization && model.organization !== 'Unknown') {
                displayText += ` (${model.organization})`;
            }
            if (model.benchmarkCount < 9) {
                displayText += ` [${model.benchmarkCount}/9]`;
            }
            
            option.textContent = displayText;
            this.selectElement.appendChild(option);
        });
        
        console.log('Model benchmark counts:');
        sortedModels.forEach(model => {
            console.log(`  ${model.name}: ${model.benchmarkCount} benchmarks`);
        });
    }

    createSVG() {
        this.calculateDimensions();

        let svgElement = document.getElementById('polarChartSvg');

        if (!svgElement) {
            svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svgElement.id = 'polarChartSvg';
            this.chartWrapper.appendChild(svgElement);
        }

        svgElement.setAttribute('width', '100%');
        svgElement.setAttribute('height', '100%');
        svgElement.setAttribute('viewBox', `0 0 ${this.width} ${this.height}`);
        svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');

        this.svg = d3.select(svgElement)
            .append('g')
            .attr('transform', `translate(${this.margin.left + this.innerWidth/2}, ${this.margin.top + this.innerHeight/2})`);
    }

    addResizeListener() {
        window.addEventListener('resize', () => {
            if (this.currentModel) {
                this.calculateDimensions();
                this.updateChart(this.currentModel);
            }
        });
    }

    updateChart(modelId) {
        if (!this.svg || !this.models[modelId]) return;
        
        const model = this.models[modelId];
        const chartData = this.getChartData(modelId);
        
        this.svg.selectAll('*').remove();
        
        if (chartData.scores.length === 0) {
            this.svg.append('text')
                .attr('x', 0)
                .attr('y', 0)
                .attr('text-anchor', 'middle')
                .attr('fill', '#fff')
                .attr('font-size', '14px')
                .text('No benchmark data available for this model');
            
            this.updateModelInfo(model);
            return;
        }
        
        const angleScale = d3.scaleLinear()
            .domain([0, chartData.labels.length])
            .range([0, Math.PI * 2]);
        
        const radialScale = d3.scaleLinear()
            .domain([0, 1])
            .range([0, this.radius]);
        
        this.createPolarGrid(radialScale);
        this.createRadialAxes(chartData.labels, angleScale, radialScale);
        
        if (chartData.scores.length >= 3) {
            this.createPolarArea(chartData, angleScale, radialScale);
        }
        
        this.createDataPoints(chartData, angleScale, radialScale);
        this.updateModelInfo(model);
        this.createLegend(chartData);
    }

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
            
            this.svg.append('text')
                .attr('x', 0)
                .attr('y', -radialScale(level) - 5)
                .attr('text-anchor', 'middle')
                .attr('fill', '#666')
                .attr('font-size', '10px')
                .text(level.toFixed(1));
        });
    }

    createRadialAxes(labels, angleScale, radialScale) {
        labels.forEach((label, i) => {
            const angle = angleScale(i);
            const x = radialScale(1.1) * Math.sin(angle);
            const y = -radialScale(1.1) * Math.cos(angle);
            
            this.svg.append('line')
                .attr('x1', 0)
                .attr('y1', 0)
                .attr('x2', radialScale(1) * Math.sin(angle))
                .attr('y2', -radialScale(1) * Math.cos(angle))
                .attr('stroke', '#ccc')
                .attr('stroke-width', 1);
            
            this.svg.append('text')
                .attr('x', x)
                .attr('y', y)
                .attr('text-anchor', 'middle')
                .attr('alignment-baseline', 'middle')
                .attr('fill', '#ffffff')
                .attr('font-size', '11px')
                .attr('font-weight', 'bold')
                .text(label);
        });
    }

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
        
        points.append('title')
            .text((d, i) => `${chartData.labels[i]}: ${d.toFixed(3)}`);
    }

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
            .attr('fill', '#ffffff')
            .attr('alignment-baseline', 'middle')
            .text(d => d);
    }

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

    updateModelInfo(model) {
        if (!this.modelInfoElement) return;
        
        const benchmarkCount = Object.keys(model.scores).length;
        const totalScore = Object.values(model.scores).reduce((sum, score) => sum + score, 0);
        const avgScore = benchmarkCount > 0 ? (totalScore / benchmarkCount).toFixed(2) : 'N/A';
        
        const normalizedScores = Object.entries(model.scores).map(([benchmarkId, score]) => 
            this.normalizeScore(score, benchmarkId)
        );
        const avgNormalizedScore = normalizedScores.length > 0 
            ? (normalizedScores.reduce((a, b) => a + b, 0) / normalizedScores.length).toFixed(3)
            : 'N/A';
        
        const orgElement = document.getElementById('model-organization');
        if (orgElement) orgElement.textContent = model.organization;
        
        const versionElement = document.getElementById('model-version');
        if (versionElement) versionElement.textContent = model.version;
        
        const dateElement = document.getElementById('model-releaseDate');
        if (dateElement) dateElement.textContent = model.releaseDate;
        
        const countryElement = document.getElementById('model-country');
        if (countryElement) countryElement.textContent = model.country;
        
        const countElement = document.getElementById('model-benchmarkCount');
        if (countElement) countElement.textContent = `${benchmarkCount}/9`;
        
        const avgElement = document.getElementById('model-avgScore');
        if (avgElement) avgElement.textContent = avgScore;
        
        const normElement = document.getElementById('model-avgNormalizedScore');
        if (normElement) normElement.textContent = avgNormalizedScore;
        
        if (countElement) {
            if (benchmarkCount === 9) {
                countElement.classList.add('complete');
                countElement.classList.remove('partial');
            } else if (benchmarkCount >= 6) {
                countElement.classList.add('partial');
                countElement.classList.remove('complete');
            } else {
                countElement.classList.remove('complete', 'partial');
            }
        }
    }

    init() {
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
            
            container.innerHTML = '';
            container.appendChild(errorDiv);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof d3 === 'undefined') return;
    
    const polarContainers = document.querySelectorAll('.polar-chart-container');
    polarContainers.forEach(container => {
        const chart = new PolarChartD3(container.id);
        chart.init();
        window.polarChartInstance = chart;
    });
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PolarChartD3;
}