class BarChartD3 {
    constructor(containerId) {
        this.containerId = containerId;
        this.benchmarkData = {};
        this.models = {};
        this.currentBenchmark = null;
        this.currentData = [];
        this.sortOrder = 'score-desc';
        this.tooltip = d3.select('body')
            .append('div') 
            .attr('class', 'bar-tooltip');

        this.maxModelsToShow = 20;
        this.showTopModelsOnly = true;
        
        this.margin = { top: 40, right: 30, bottom: 60, left: 200 }; // Increased left margin for long names
        this.width = 0;
        this.height = 0;
        
        this.colors = {
            low: '#e74c3c',
            medium: '#f39c12',
            high: '#2ecc71'
        };
    }
    
    initFromPolarData(benchmarkData, models) {
        this.benchmarkData = benchmarkData;
        this.models = models;
        this.initializeUI();
        this.populateBenchmarkSelect();
    }
    
    initializeUI() {
        const select = document.getElementById('barBenchmarkSelect');
        const sortSelect = document.getElementById('barModelSort');
        
        if (select) {
            select.addEventListener('change', (e) => {
                this.currentBenchmark = e.target.value;
                this.updateChart();
            });
        }
        
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.sortOrder = e.target.value;
                this.updateChart();
            });
        }
        
        window.addEventListener('resize', () => this.handleResize());
    }

    populateBenchmarkSelect() {
        const select = document.getElementById('barBenchmarkSelect');
        if (!select) return;
        
        select.innerHTML = '<option value="" disabled selected>Select a benchmark...</option>';
        
        Object.values(this.benchmarkData)
            .sort((a, b) => a.name.localeCompare(b.name))
            .forEach(benchmark => {
                const option = document.createElement('option');
                option.value = benchmark.id;
                option.textContent = benchmark.name;
                select.appendChild(option);
            });

        if (!this.currentBenchmark && Object.keys(this.benchmarkData).length > 0) {
            const firstId = Object.keys(this.benchmarkData)[0];
            select.value = firstId;
            this.currentBenchmark = firstId;
            setTimeout(() => this.updateChart(), 100);
        }
    }
    
    prepareData() {
        const benchmark = this.benchmarkData[this.currentBenchmark];
        if (!benchmark) return;

        let raw = benchmark.models || benchmark.scores || [];

        if (!Array.isArray(raw)) {
            raw = Object.entries(raw).map(([id, val]) => ({ 
                modelId: id, 
                score: typeof val === 'object' ? val.score : val 
            }));
        }

        //Map data and ensure unique modelIds
        const mapped = raw.map(d => {
            const id = d.modelId || d.model || d.Model || d.name;
            const info = this.models[id] || {};
            let val = d.score || d.value || 0;
            if (typeof val === 'string') val = val.replace(',', '.');
            const score = parseFloat(val) || 0;

            return {
                modelId: id,
                score: score,
                displayName: info.name || id,
                org: info.organization || "Unknown",
                normalized: this.normalizeScore(score)
            };
        }).filter(d => d.score > 0);

        // 2. Strict Deduplication by modelId
        const unique = new Map();
        mapped.forEach(item => {
            // If duplicate ID exists, keep the higher score
            if (!unique.has(item.modelId) || item.score > unique.get(item.modelId).score) {
                unique.set(item.modelId, item);
            }
        });
        
        this.currentData = Array.from(unique.values());

        // 3. Sorting
        this.currentData.sort((a, b) => {
            return this.sortOrder === 'score-desc' ? b.score - a.score : a.score - b.score;
        });

        if (this.showTopModelsOnly) {
            this.currentData = this.currentData.slice(0, this.maxModelsToShow);
        }
    }

    normalizeScore(score) {
        return Math.min(score / (this.currentBenchmark === 'eci' ? 200 : 100), 1);
    }

    updateChart() {
        if (!this.currentBenchmark) return;
        
        const container = document.querySelector('.bar-chart-wrapper');
        if (!container) return;
        
        this.width = container.clientWidth;
        this.height = container.clientHeight || 500;
        
        this.prepareData();

        // NUCLEAR RESET: Remove everything before drawing to prevent coordinate glitches
        const svg = d3.select(`#${this.containerId} svg`);
        svg.selectAll('*').remove();
        
        svg.attr('viewBox', `0 0 ${this.width} ${this.height}`);
        const chartGroup = svg.append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

        if (this.currentData.length === 0) return;

        const innerW = this.width - this.margin.left - this.margin.right;
        const innerH = this.height - this.margin.top - this.margin.bottom;
        
        // Use modelId for the scale domain to ensure uniqueness
        const yScale = d3.scaleBand()
            .domain(this.currentData.map(d => d.modelId)) 
            .range([0, innerH])
            .padding(0.2);

        const xScale = d3.scaleLinear()
            .domain([0, d3.max(this.currentData, d => d.score) * 1.05])
            .range([0, innerW]);

        const colorScale = d3.scaleLinear()
            .domain([0, 0.5, 1])
            .range([this.colors.low, this.colors.medium, this.colors.high]);

        // X-Axis
        chartGroup.append('g')
            .attr('transform', `translate(0, ${innerH})`)
            .call(d3.axisBottom(xScale).ticks(5));

        // Y-Axis: We use modelId for position but tickFormat to show the Display Name
        chartGroup.append('g')
            .call(d3.axisLeft(yScale).tickFormat(id => {
                const item = this.currentData.find(d => d.modelId === id);
                return item ? item.displayName : id;
            }));

        // Draw Bars
        chartGroup.selectAll('.bar')
            .data(this.currentData)
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', 0)
            .attr('y', d => yScale(d.modelId))
            .attr('height', yScale.bandwidth())
            .attr('fill', d => colorScale(d.normalized))
            .attr('width', 0) 
            .on('mouseover', (event, d) => {
                // 1. Fade in and populate the tooltip
                const tooltip = d3.select('.bar-tooltip');
                tooltip.transition().duration(200).style('opacity', 0.9);
                tooltip.html(`
                    <span class="tooltip-title">${d.displayName}</span><br/>
                    <span class="tooltip-label">Org:</span>
                    <span class="tooltip-value">${d.org}</span><br/>
                    <span class="tooltip-label">Score:</span> 
                    <span class="tooltip-value">${d.score.toFixed(3)}</span>
                `);
                
                // 2. Visual highlight for the bar
                d3.select(event.currentTarget)
                    .style('opacity', 0.8)
                    .attr('stroke', '#64ffda')
                    .attr('stroke-width', 2);
            })
            .on('mousemove', (event) => {
                // 3. Make the tooltip follow the mouse
                d3.select('.bar-tooltip')
                    .style('left', (event.pageX + 15) + 'px')
                    .style('top', (event.pageY - 28) + 'px');
            })
            .on('mouseout', (event) => {
                // 4. Hide tooltip and remove highlight
                d3.select('.bar-tooltip').transition().duration(300).style('opacity', 0);
                
                d3.select(event.currentTarget)
                    .style('opacity', 1)
                    .attr('stroke', 'none');
            })
            .transition()
            .duration(800)
            .attr('width', d => xScale(d.score));
            
        this.updateStats();
    }

    updateStats() {
        const scores = this.currentData.map(d => d.score);
        const max = Math.max(...scores);
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        
        const set = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };

        set('stat-models-count', this.currentData.length);
        set('stat-highest-score', max.toFixed(3));
        set('stat-avg-score', avg.toFixed(3));
        set('stat-benchmark-name', this.benchmarkData[this.currentBenchmark].name);
    }

    handleResize() {
        if (this.currentBenchmark) this.updateChart();
    }
}

// Initialization loop
(function init() {
    if (window.polarChartInstance && Object.keys(window.polarChartInstance.benchmarkData).length > 0) {
        window.barChartInstance = new BarChartD3('bar-chart-1');
        window.barChartInstance.initFromPolarData(
            window.polarChartInstance.benchmarkData, 
            window.polarChartInstance.models
        );
    } else {
        setTimeout(init, 300);
    }
})();