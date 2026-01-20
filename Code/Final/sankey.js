// sankey-worries.js
document.addEventListener('DOMContentLoaded', function() {
    // Configurazione del grafico
    const config = {
        width: 800,
        height: 600,
        margin: { top: 40, right: 40, bottom: 40, left: 40 },
        nodeWidth: 20,
        nodePadding: 10,
        colors: {
            categories: ['#4e79a7', '#f28e2c', '#e15759', '#76b7b2', '#59a14f', '#edc949'],
            worryLevels: {
                'very worried': '#e15759',
                'fairly worried': '#f28e2c',
                'not very worried': '#76b7b2',
                'not worried at all': '#59a14f',
                "don't know": '#bab0ab'
            }
        }
    };

    // Carica i dati CSV
    d3.csv('data/americans-worry-work-being-automated.csv')
        .then(function(data) {
            // Pulisci e trasforma i dati
            const processedData = processData(data);
            
            // Crea il grafico
            createSankeyChart(processedData);
        })
        .catch(function(error) {
            console.error('Errore nel caricamento dei dati:', error);
            document.getElementById('chart-socio-environment').innerHTML = 
                '<p class="error">Errore nel caricamento dei dati. Controlla la console per i dettagli.</p>';
        });

    // Funzione per processare i dati CSV in formato Sankey
    function processData(rawData) {
        const nodes = [];
        const links = [];
        
        // Mappa per tenere traccia dei nodi già aggiunti
        const nodeMap = new Map();
        let nodeId = 0;
        
        // Funzione helper per aggiungere nodi
        function addNode(name, category) {
            if (!nodeMap.has(name)) {
                nodeMap.set(name, nodeId);
                nodes.push({
                    id: nodeId,
                    name: name,
                    category: category,
                    value: 0 // Sarà calcolato dopo
                });
                nodeId++;
            }
            return nodeMap.get(name);
        }
        
        // Processa ogni riga del CSV
        rawData.forEach(row => {
            const entity = row.entity;
            const entityNodeId = addNode(entity, 'entity');
            
            // Aggiungi link per ogni livello di preoccupazione
            const worryLevels = [
                { key: 'very worried', label: 'Molto preoccupato' },
                { key: 'fairly worried', label: 'Abbastanza preoccupato' },
                { key: 'not very worried', label: 'Poco preoccupato' },
                { key: 'not worried at all', label: 'Per niente preoccupato' },
                { key: "don't know", label: 'Non sa' }
            ];
            
            worryLevels.forEach(level => {
                const value = parseFloat(row[level.key]) || 0;
                if (value > 0) {
                    const targetName = `${level.label} (${value}%)`;
                    const targetNodeId = addNode(targetName, 'worry_level');
                    
                    links.push({
                        source: entityNodeId,
                        target: targetNodeId,
                        value: value,
                        worryLevel: level.key,
                        entity: entity
                    });
                }
            });
        });
        
        // Calcola i valori totali per ogni nodo
        links.forEach(link => {
            nodes[link.source].value += link.value;
            nodes[link.target].value += link.value;
        });
        
        return { nodes, links };
    }

    // Funzione per creare il Sankey diagram
    function createSankeyChart(data) {
        const { nodes, links } = data;
        
        // Calcola dimensioni del grafico
        const chartWidth = config.width - config.margin.left - config.margin.right;
        const chartHeight = config.height - config.margin.top - config.margin.bottom;
        
        // Seleziona il contenitore
        const container = d3.select('#chart-socio-environment')
            .style('width', config.width + 'px')
            .style('height', config.height + 'px');
        
        // Crea SVG
        const svg = container.append('svg')
            .attr('width', config.width)
            .attr('height', config.height)
            .append('g')
            .attr('transform', `translate(${config.margin.left}, ${config.margin.top})`);
        
        // Crea il layout Sankey
        const sankey = d3.sankey()
            .nodeWidth(config.nodeWidth)
            .nodePadding(config.nodePadding)
            .extent([[0, 0], [chartWidth, chartHeight]]);
        
        // Applica il layout ai dati
        const { nodes: sankeyNodes, links: sankeyLinks } = sankey({
            nodes: nodes.map(d => ({ ...d })),
            links: links.map(d => ({ ...d }))
        });
        
        // Crea i link (flussi)
        const link = svg.append('g')
            .selectAll('path')
            .data(sankeyLinks)
            .enter()
            .append('path')
            .attr('class', 'sankey-link')
            .attr('d', d3.sankeyLinkHorizontal())
            .attr('stroke', d => config.colors.worryLevels[d.worryLevel] || '#ccc')
            .attr('stroke-width', d => Math.max(1, d.width))
            .attr('fill', 'none')
            .attr('opacity', 0.6)
            .style('stroke-linecap', 'round');
        
        // Aggiungi interazione ai link
        link.append('title')
            .text(d => `${d.source.name} → ${d.target.name}\n${d.value}%`);
        
        // Crea i nodi
        const node = svg.append('g')
            .selectAll('g')
            .data(sankeyNodes)
            .enter()
            .append('g')
            .attr('class', 'sankey-node')
            .attr('transform', d => `translate(${d.x0}, ${d.y0})`);
        
        // Aggiungi rettangoli per i nodi
        node.append('rect')
            .attr('height', d => d.y1 - d.y0)
            .attr('width', config.nodeWidth)
            .attr('fill', d => {
                if (d.category === 'entity') return '#4e79a7';
                return config.colors.worryLevels[d.worryLevel] || '#ccc';
            })
            .attr('stroke', '#fff')
            .attr('stroke-width', 1)
            .attr('rx', 3) // Angoli arrotondati
            .attr('ry', 3);
        
        // Aggiungi etichette ai nodi
        node.append('text')
            .attr('x', d => d.x0 < chartWidth / 2 ? config.nodeWidth + 6 : -6)
            .attr('y', d => (d.y1 - d.y0) / 2)
            .attr('dy', '0.35em')
            .attr('text-anchor', d => d.x0 < chartWidth / 2 ? 'start' : 'end')
            .attr('fill', '#fff')
            .attr('font-size', '12px')
            .attr('font-weight', '500')
            .text(d => d.name)
            .append('tspan')
            .attr('class', 'node-value')
            .attr('dx', '4px')
            .attr('font-size', '10px')
            .attr('fill', 'rgba(255,255,255,0.7)')
            .text(d => `(${d.value.toFixed(1)}%)`);
        
        // Aggiungi titolo
        svg.append('text')
            .attr('x', chartWidth / 2)
            .attr('y', -20)
            .attr('text-anchor', 'middle')
            .attr('fill', '#fff')
            .attr('font-size', '16px')
            .attr('font-weight', 'bold')
            .text('Preoccupazione Automazione Lavoro - USA');
        
        // Aggiungi legenda
        createLegend(svg, chartWidth, chartHeight);
        
        // Aggiungi interattività
        addInteractivity(node, link);
    }
    
    // Funzione per creare la legenda
    function createLegend(svg, width, height) {
        const legendData = [
            { label: 'Fascia Demografica', color: '#4e79a7' },
            { label: 'Molto preoccupato', color: '#e15759' },
            { label: 'Abbastanza preoccupato', color: '#f28e2c' },
            { label: 'Poco preoccupato', color: '#76b7b2' },
            { label: 'Per niente preoccupato', color: '#59a14f' },
            { label: 'Non sa', color: '#bab0ab' }
        ];
        
        const legend = svg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${width - 200}, ${height - 150})`);
        
        legendData.forEach((item, i) => {
            const legendItem = legend.append('g')
                .attr('transform', `translate(0, ${i * 25})`);
            
            legendItem.append('rect')
                .attr('width', 15)
                .attr('height', 15)
                .attr('fill', item.color)
                .attr('rx', 2)
                .attr('ry', 2);
            
            legendItem.append('text')
                .attr('x', 20)
                .attr('y', 10)
                .attr('fill', '#fff')
                .attr('font-size', '11px')
                .attr('dominant-baseline', 'middle')
                .text(item.label);
        });
    }
    
    // Funzione per aggiungere interattività
    function addInteractivity(nodes, links) {
        // Highlight su hover
        nodes.on('mouseover', function(event, d) {
            // Riduci opacità di tutti gli elementi
            d3.selectAll('.sankey-link')
                .style('opacity', 0.1);
            d3.selectAll('.sankey-node')
                .style('opacity', 0.3);
            
            // Evidenzia il nodo corrente
            d3.select(this)
                .style('opacity', 1);
            
            // Evidenzia i link correlati
            const relatedLinks = links.filter(link => 
                link.source.id === d.id || link.target.id === d.id
            );
            
            relatedLinks.style('opacity', 0.8);
        });
        
        nodes.on('mouseout', function() {
            // Ripristina opacità
            d3.selectAll('.sankey-link')
                .style('opacity', 0.6);
            d3.selectAll('.sankey-node')
                .style('opacity', 1);
        });
        
        // Tooltip avanzato
        nodes.on('mousemove', function(event, d) {
            const tooltip = d3.select('#sankey-tooltip');
            if (tooltip.empty()) {
                // Crea tooltip se non esiste
                d3.select('body').append('div')
                    .attr('id', 'sankey-tooltip')
                    .style('position', 'absolute')
                    .style('background', 'rgba(0,0,0,0.8)')
                    .style('color', 'white')
                    .style('padding', '10px')
                    .style('border-radius', '5px')
                    .style('pointer-events', 'none')
                    .style('font-size', '12px')
                    .style('display', 'none');
            }
            
            d3.select('#sankey-tooltip')
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px')
                .style('display', 'block')
                .html(`
                    <strong>${d.name}</strong><br>
                    Totale: ${d.value.toFixed(1)}%<br>
                    Categoria: ${d.category === 'entity' ? 'Fascia Demografica' : 'Livello Preoccupazione'}
                `);
        });
        
        nodes.on('mouseleave', function() {
            d3.select('#sankey-tooltip').style('display', 'none');
        });
    }
});