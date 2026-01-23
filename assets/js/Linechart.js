
document.addEventListener('DOMContentLoaded', function() {
    const chartContainer = d3.select('#chart-social');
    const select = d3.select('#entity-select'); // Target the existing HTML select

    chartContainer.html('');
    

    // Graph dimensions
    const margin = { top: 60, right: 30, bottom: 60, left: 60 };
    const width = 800 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;
    
    // Create SVG
    const svg = chartContainer.append('svg')
        .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("width", "100%")  // Makes it scale with container zoom
        .style("height", "auto")
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
        const colorBlindFriendlyColors = [
        "#E69F00", // Orange
        "#000000",  // Black (Optional, maybe swap for #FFFFFF on your dark theme)
        "#009E73", // Bluish Green
        "#D55E00", // Vermillion
        "#CC79A7" // Reddish Purple
    ];

    // color palette
    const colorScale = d3.scaleOrdinal(colorBlindFriendlyColors);


    // Axis
    const xAxisGroup = svg.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0,${height})`)
    
    const yAxisGroup = svg.append('g')
        .attr('class', 'y-axis')
    
    // X-axis itle
    svg.append('text')
        .attr('class', 'axis-label')
        .attr('x', width / 2)
        .attr('y', height + margin.bottom - 10)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .text('Poll date');
    
    // Y-axis title
    svg.append('text')
        .attr('class', 'axis-label')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', -margin.left + 15)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .text('Percentage of partecipants');
    
    // Legend
    const legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${width - 150}, 0)`);
        
    // function to draw the chart
    function drawChart(selectedData, selectedEntity) {
        // Pulisci gli elementi del grafico
        svg.selectAll('.worry-line').remove();
        svg.selectAll('.data-dot').remove();
        svg.select('.chart-title').remove();
        svg.select('.chart-subtitle').remove();
        legend.selectAll('*').remove();
        
        const categories = ['Very worried', 'Fairly worried', 'Not very worried', 'Not worried at all', 'Don\'t know'];
        

        const stackedData = categories.map(category => {
            return {
                category: category,
                values: selectedData.map(d => ({
                    date: d.Day,
                    value: d[category]
                }))
            };
        });
        
        const xScale = d3.scaleTime()
            .domain(d3.extent(selectedData, d => d.Day))
            .range([0, width]);
        
        const yScale = d3.scaleLinear()
            .domain([0, 100])
            .range([height, 0]);

        xAxisGroup.call(d3.axisBottom(xScale)
        .tickValues(selectedData.map(d=> d.Day))
        .tickFormat(d3.timeFormat('%b %Y')));

        yAxisGroup.call(d3.axisLeft(yScale)
        .tickFormat(d => d + '%'));
        
        xAxisGroup.selectAll("text")
            .style("fill", "#fff");

        yAxisGroup.selectAll("text")
            .style("fill", "#fff");

        // Title
        svg.append('text')
            .attr('class', 'chart-title')
            .attr('x', width / 2)
            .attr('y', -margin.top / 2)
            .attr('text-anchor', 'middle')
            .style('font-size', '18px')
            .style('font-weight', 'bold')
            .text('Concern of Americans about job automation');
        

        // Subtitle
        svg.append('text')
            .attr('class', 'chart-subtitle')
            .attr('x', width / 2)
            .attr('y', -margin.top / 2 + 25)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('fill', '#666')
            .text(`Trend from 2021 to 2025 ${selectedEntity}`);
        

        // Lines for each category
        const line = d3.line()
            .x(d => xScale(d.date))
            .y(d => yScale(d.value));

        // Add lines
        stackedData.forEach(categoryData => {
            svg.append('path')
                .datum(categoryData.values)
                .attr('class', 'worry-line')
                .attr('d', line)
                .attr('stroke', colorScale(categoryData.category))
                .attr('stroke-width', 3)
                .attr('fill', 'none');
            
        // Add dots on data
        svg.selectAll(`.dot-${categoryData.category.replace(/\s+/g,'-').replace(/'/g, '')}`)
            .data(categoryData.values)
            .enter()
            .append('circle')
            .attr('class', 'data-dot')
            .attr('data-category', categoryData.category)
            .attr('cx', d => xScale(d.date))
            .attr('cy', d => yScale(d.value))
            .attr('r', 4)
            .attr('fill', colorScale(categoryData.category))
            .attr('stroke', '#fff')
            .attr('stroke-width', 1);
        });

        categories.forEach((category, i) => {
            const legendItem = legend.append('g')
                .attr('transform', `translate(0, ${i * 25})`);
            
            legendItem.append('rect')
                .attr('width', 15)
                .attr('height', 15)
                .attr('fill', colorScale(category));
            
            legendItem.append('text')
                .attr('x', 20)
                .attr('y', 12)
                .style('fill', '#ffffff')
                .style('font-size', '12px')
                .text(category);
        });

    }
    // Tooltip
    const tooltip = d3.select('body').append('div')
        .attr('class', 'worry-tooltip')
        .style('position', 'absolute')
        .style('background', 'rgba(255, 255, 255, 0.95)')
        .style('border', '1px solid #ddd')
        .style('border-radius', '4px')
        .style('padding', '10px')
        .style('pointer-events', 'none')
        .style('box-shadow', '0 2px 10px rgba(0,0,0,0.1)')
        .style('opacity', 0);
    

    // tooltip update function
    function setupTooltip() {
        svg.selectAll('.data-dot')
            .on('mouseover', function(event, d) {
                tooltip.transition()
                    .duration(200)
                    .style('opacity', .9);
                
                // Trova la categoria di questo punto
                const category = d3.select(this).attr('data-category');
                
                tooltip.html(`
                    <strong>${category}</strong><br/>
                    Data: ${d3.timeFormat('%B %Y')(d.date)}<br/>
                    Percentuale: ${d.value}%<br/>
                `)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 28) + 'px');
            })
            .on('mouseout', function() {
                tooltip.transition()
                    .duration(500)
                    .style('opacity', 0);
            });
    }
    
    // CSV data loading
    d3.csv('../../data/americans-worry-work-being-automated.csv').then(data => {
        // Formatta i dati
        data.forEach(d => {
            d.Day = new Date(d.Day);
            d['Very worried'] = +d['Very worried'];
            d['Fairly worried'] = +d['Fairly worried'];
            d['Not very worried'] = +d['Not very worried'];
            d['Not worried at all'] = +d['Not worried at all'];
            d['Don\'t know'] = +d['Don\'t know'];
        });
        
        // Estrai tutte le categorie uniche
        const entities = [...new Set(data.map(d => d.Entity))];
        
        // Popola il selettore
        select.selectAll('option')
            .data(entities)
            .enter()
            .append('option')
            .attr('value', d => d)
            .text(d => d)
            .property('selected', d => d === 'All adults');
        
        // Disegna il grafico iniziale
        const initialData = data.filter(d => d.Entity === 'All adults');
        drawChart(initialData, 'All adults');
        setupTooltip();
        
        // Aggiorna il grafico quando cambia la selezione
        select.on('change', function() {
            const selectedEntity = this.value;
            const filteredData = data.filter(d => d.Entity === selectedEntity);
            drawChart(filteredData, selectedEntity);
            setupTooltip();
        });
            
    }).catch(error => {
        console.error('Errore nel caricamento dei dati:', error);
        chartContainer.html('<p style="color: red; padding: 20px;">Errore nel caricamento dei dati. Controlla il percorso del file CSV.</p>');
    });
});
    