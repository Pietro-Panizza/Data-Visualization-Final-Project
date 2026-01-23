// Configuration
const margin = { top: 40, right: 40, bottom: 150, left: 60 };
const width = 900 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

// Define bins for Model Parameters
const binConfig = [
    { label: "<50B", min: 0, max: 50 },
    { label: "50-200B", min: 50, max: 200 },
    { label: "200-500B", min: 200, max: 500 },
    { label: "500-1000B", min: 500, max: 1000 },
    { label: ">1000B", min: 1000, max: Infinity }
];

// Color palette for regions
const colorScale = d3.scaleOrdinal(d3.schemeTableau10);

// Create tooltip div
const tooltip = d3.select("body").append("div")
    .attr("class", "d3-tooltip")
    .style("opacity", 0);

let currentUnit = 'kWh';

// Initialize SVG
const svg = d3.select("#chart-environment-container")
    .html("") // Clear placeholder
    .append("svg")
    .attr("width", "100%")
    .attr("height", "auto")
    .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// Load and Process Data
d3.csv("../data/llm-energy-use.csv").then(data => {
    // 1. Clean Data
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
        currentUnit = metric === 'total_energy_kWh' ? "kWh" : "kgCO2e"
        // 2. Aggregate data by Bin and Region
        const aggregated = binLabels.map(label => {
            const obj = { bin: label };
            regions.forEach(reg => {
                obj[reg] = d3.sum(data.filter(d => d.param_bin === label && d.data_center_region === reg), d => d[metric]);
            });
            return obj;
        });

        // 3. Setup Stacking (Streamgraph mode)
        const stack = d3.stack()
            .keys(regions)
            .offset(d3.stackOffsetWiggle)
            .order(d3.stackOrderInsideOut);

        const layers = stack(aggregated);

        // 4. Scales
        const x = d3.scalePoint()
            .domain(binLabels)
            .range([0, width]);

        const y = d3.scaleLinear()
            .domain([
                d3.min(layers, l => d3.min(l, d => d[0])),
                d3.max(layers, l => d3.max(l, d => d[1]))
            ])
            .range([height, 0]);

        // 5. Drawing Area
        const area = d3.area()
            .x(d => x(d.data.bin))
            .y0(d => y(d[0]))
            .y1(d => y(d[1]))
            .curve(d3.curveBasis);

        // Render Streams
        const paths = svg.selectAll(".layer")
            .data(layers);

        paths.enter()
            .append("path")
            .attr("class", "layer")
            .merge(paths) // This ensures existing paths also get the update
            .on("mouseover", function(event, d) {
                d3.select(this).style("stroke", "white").style("stroke-width", "1px").attr("opacity", 1);
                tooltip.transition().duration(200).style("opacity", 1);
            })
            .on("mousemove", function(event, d) {
                const mouseX = d3.pointer(event)[0];
                const domain = x.domain();
                const range = x.range();
                
                // Bisect finds the index in our range array nearest to the mouse
                const index = d3.bisect(range, mouseX);
                const currentBin = domain[Math.max(0, index - 1)];
                
                const binData = d.find(p => p.data.bin === currentBin);
                const value = binData ? (binData[1] - binData[0]) : 0;

                tooltip.html(`
                    <div class="tooltip-title">${d.key}</div>
                    <strong>Range:</strong> ${currentBin}<br/>
                    <strong>Value:</strong> ${Math.round(value).toLocaleString()} ${currentUnit}
                `) // ^ Changed 'unit' to 'currentUnit' and added Math.round for cleaner numbers
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function() {
                d3.select(this).style("stroke", "none").attr("opacity", 0.85);
                tooltip.transition().duration(300).style("opacity", 0);
            })
            .transition().duration(750) // Smooth transition for the shapes
            .attr("d", area)
            .style("fill", d => colorScale(d.key));

        paths.exit().remove();

        // 7. Axes
        svg.selectAll(".axis").remove();
        
        svg.append("g")
            .attr("class", "axis")
            .attr("transform", `translate(0,${height + 20})`)
            .call(d3.axisBottom(x))
            .style("color", "#888")
            .style("font-size", "12px");

        // 8. Legend
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
                const xOffset = (i % 3) * 200; // 3 items per row
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