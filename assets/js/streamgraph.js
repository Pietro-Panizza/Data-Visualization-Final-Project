// Configuration
const margin = { top: 40, right: 40, bottom: 150, left: 60 };
const width = 900 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

// Define bins for Model Parameters
const binConfig = [
    { label: "<50B", min: 0, max: 50, plotX: 50 },
    { label: "50-200B", min: 50, max: 200, plotX: 200},
    { label: "200-500B", min: 200, max: 500, plotX: 500},
    { label: "500-1000B", min: 500, max: 1000, plotX: 1000},
    { label: ">1000B", min: 1000, max: Infinity, plotX: 1200 }
];

const colorBlindFriendlyColors = [
    "#E69F00", // Orange
    "#56B4E9", // Sky Blue
    "#000000",  // Black (Optional, maybe swap for #FFFFFF on your dark theme)
    "#009E73", // Bluish Green
    "#F0E442", // Yellow
    "#0072B2", // Blue
    "#D55E00", // Vermillion
    "#CC79A7" // Reddish Purple
];

// Color palette for regions
const colorScale = d3.scaleOrdinal(colorBlindFriendlyColors);

// Create tooltip div
const tooltip = d3.select("body").append("div")
    .attr("class", "d3-tooltip")
    .style("opacity", 0);

let currentUnit = 'kWh';

// Initialize SVG
const svg = d3.select("#chart-environment-container")
    .html("") 
    .append("svg")
    .attr("width", "100%")
    // .attr("height", "auto")
    .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// Load and Process Data
d3.csv("../data/llm-energy-use.csv").then(data => {

    // Clean Data
    data.forEach(d => {
        d.model_parameters_billion = +d.model_parameters_billion || 0;
        d.total_energy_kwh = +d.total_energy_kwh || 0;
        d.total_carbon_footprint_kgco2e = +d.total_carbon_footprint_kgco2e || 0;
        
        // Find the bin
        const bin = binConfig.find(b => d.model_parameters_billion >= b.min && d.model_parameters_billion < b.max);
        d.param_bin = bin ? bin.label : "Unknown";
    });

    const regions = Array.from(new Set(data.map(d => d.data_center_region)));
    const binLabels = binConfig.map(b => b.label);

    function updateChart(metric) {
        currentUnit = metric === 'total_energy_kwh' ? "kWh" : "kgCO2e"

        // Aggregate data by Bin and Region
        let aggregated = binConfig.map(bin => {
            const obj = { 
                bin: bin.label,
                plotX: bin.plotX
             };
            regions.forEach(reg => {
                obj[reg] = d3.sum(data.filter(d => 
                    d.param_bin === bin.label && d.data_center_region === reg), d =>
                         d[metric]);
            });
            return obj;
        });

        const zeroPoint = { bin: "Start", plotX: 0 };
        regions.forEach(reg => zeroPoint[reg] = 0);
        aggregated = [zeroPoint, ...aggregated];

        // Setup Stacking (Streamgraph mode)
        const stack = d3.stack()
            .keys(regions)
            .offset(d3.stackOffsetWiggle)
            .order(d3.stackOrderInsideOut);

        const layers = stack(aggregated);

        // Scales
        const x = d3.scaleLinear()
            .domain([0, 1200])
            .range([0, width]);

        const y = d3.scaleLinear()
            .domain([
                d3.min(layers, l => d3.min(l, d => d[0])),
                d3.max(layers, l => d3.max(l, d => d[1]))
            ])
            .range([height, 0]);

        // Drawing Area
        const area = d3.area()
            .x(d => x(d.data.plotX))
            .y0(d => y(d[0]))
            .y1(d => y(d[1]))
            .curve(d3.curveMonotoneX);

        // Render Streams
        const paths = svg.selectAll(".layer")
            .data(layers);

        paths.enter()
            .append("path")
            .attr("class", "layer")
            .merge(paths) 
            .on("mouseover", function(event, d) {
                d3.select(this).style("stroke", "white").style("stroke-width", "1px").attr("opacity", 1);
                tooltip.transition().duration(200).style("opacity", 1);
            })
            .on("mousemove", function(event, d) {
                const mouseX = d3.pointer(event)[0];
                
                // Use invert to find value on linear scale
                const xValue = x.invert(mouseX);
                
                // Find closest bin based on plotX
                // We compare the mouse value to the plotX of our bins
                let closestBin = binConfig.find(b => b.plotX >= xValue);
    
                // If the mouse is past the last defined plotX (1200), default to the last bin
                if (!closestBin) {
                    closestBin = binConfig[binConfig.length - 1];
                }
                
                // Find the data value for this specific region (d.key) and bin
                const binData = d.find(p => p.data.bin === closestBin.label);
                const value = binData ? (binData[1] - binData[0]) : 0;

                tooltip.html(`
                    <div class="tooltip-title">${d.key}</div>
                    <strong>Range:</strong> ${closestBin.label}<br/>
                    <strong>Value:</strong> ${Math.round(value).toLocaleString()} ${currentUnit}
                `) 
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function() {
                d3.select(this).style("stroke", "none").attr("opacity", 0.85);
                tooltip.transition().duration(300).style("opacity", 0);
            })
            .transition().duration(750) 
            .attr("d", area)
            .style("fill", d => colorScale(d.key));

        paths.exit().remove();

        // Axes
        svg.selectAll(".axis").remove();

        const xAxis = d3.axisBottom(x)
            .tickValues([0, 50, 200, 500, 1000, 1200]) 
            .tickFormat(d => d === 1200 ? ">1000B" : d + "B"); 
        
        svg.append("g")
            .attr("class", "axis")
            .attr("transform", `translate(0,${height + 20})`)
            .call(xAxis)
            .style("color", "#888")
            .style("font-size", "12px");

        // Legend
        svg.selectAll(".legend-group").remove();
        const legendGroup = svg.append("g")
            .attr("class", "legend-group")
            .attr("transform", `translate(0, ${height + 60})`);

        const legendItems = legendGroup.selectAll(".legend-item")
            .data(regions)
            .enter()
            .append("g")
            .attr("class", "legend-item")
            .attr("transform", (d, i) => {
                const xOffset = (i % 3) * 200; 
                const yOffset = Math.floor(i / 3) * 25;
                return `translate(${xOffset}, ${yOffset})`;
            });

        legendItems.append("rect")
            .attr("width", 12)
            .attr("height", 12)
            .attr("rx", 2)
            .attr("fill", d => colorScale(d));

        legendItems.append("text")
            .attr("x", 20)
            .attr("y", 11)
            .text(d => d)
            .style("fill", "#fff")
            .style("font-size", "11px");
    }

    // Initial load
    updateChart("total_energy_kwh");

    // Handle dropdown change
    d3.select("#metric-select").on("change", function() {
        updateChart(this.value);
    });
});