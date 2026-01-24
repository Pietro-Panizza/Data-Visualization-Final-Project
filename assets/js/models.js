const margin = {top: 40, right: 40, bottom: 60, left: 70};
const width = 1000 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

// global variables for data and graphs
let allData = [];
let filteredData = [];
let currentMinYear = 1950;
let currentMaxYear = 2024;
let minDataYear = 1950;
let maxDataYear = 2024;

let debounceTimer;
let chartUpdateFunctions = [];

// Helper function to format Billions instead of Giga
const formatValue = (val) => d3.format(".2s")(val).replace("G", "B");

d3.csv("/Data-Visualization-Final-Project/data/ai_models/all_ai_models.csv").then(function(data) {
    const parseDate = d3.timeParse("%Y-%m-%d");

    allData = data.map(d => {
        const date = parseDate(d["Publication date"]);
        return {
            name: d["System"] || d["Model"],
            date: date,
            year: date ? date.getFullYear() : null,
            params: +d["Parameters"],
            compute: +d["Training compute (FLOP)"],
            time: +d["Training time (hours)"],
            dataset: +d["Training dataset size (gradients)"]
        };
    }).filter(d => d.date);

    const years = allData.map(d => d.year).filter(d => d !== null && !isNaN(d));
    if (years.length === 0) return;
    
    minDataYear = Math.min(...years);
    maxDataYear = Math.max(...years);
    currentMinYear = minDataYear;
    currentMaxYear = maxDataYear;
    filteredData = allData;
    
    createDualRangeSlider();
    initializeCharts();
    
}).catch(err => {
    console.error("Errore:", err);
});

function createDualRangeSlider() {
    if (d3.select("#dual-slider-container").empty()) {
        const sliderContainer = d3.select("main.container")
            .insert("section", ".chart-section")
            .attr("id", "dual-slider-container")
            .attr("class", "slider-section");
        
        sliderContainer.append("h2").text("Filter by Year Range").style("color", "white");
        const sliderWrapper = sliderContainer.append("div").attr("class", "slider-wrapper");
        sliderWrapper.append("div").attr("class", "slider-track");
        const activeTrack = sliderWrapper.append("div").attr("class", "slider-active-track");
        
        const minSlider = sliderWrapper.append("input")
            .attr("type", "range").attr("id", "min-slider").attr("class", "range-slider")
            .attr("min", minDataYear).attr("max", maxDataYear).attr("value", currentMinYear);
        
        const maxSlider = sliderWrapper.append("div").append("input")
            .attr("type", "range").attr("id", "max-slider").attr("class", "range-slider")
            .attr("min", minDataYear).attr("max", maxDataYear).attr("value", currentMaxYear);
        
        const valuesDisplay = sliderContainer.append("div").attr("class", "slider-values");
        valuesDisplay.append("span").attr("id", "min-value").text(currentMinYear);
        valuesDisplay.append("span").attr("id", "max-value").text(currentMaxYear);
        sliderContainer.append("div").attr("id", "model-count");
        
        function updateActiveTrack() {
            const minPercent = ((currentMinYear - minDataYear) / (maxDataYear - minDataYear)) * 100;
            const maxPercent = ((currentMaxYear - minDataYear) / (maxDataYear - minDataYear)) * 100;
            activeTrack.style("left", `${minPercent}%`).style("width", `${maxPercent - minPercent}%`);
        }
        
        minSlider.on("input", function() {
            currentMinYear = Math.min(+this.value, currentMaxYear);
            this.value = currentMinYear;
            updateSliderDisplay();
            updateActiveTrack();
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(updateDataAndCharts, 100);
        });
        
        maxSlider.on("input", function() {
            currentMaxYear = Math.max(+this.value, currentMinYear);
            this.value = currentMaxYear;
            updateSliderDisplay();
            updateActiveTrack();
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(updateDataAndCharts, 100); 
        });
        
        updateActiveTrack();
        updateSliderDisplay();
    }
}

function updateSliderDisplay() {
    d3.select("#min-value").text(currentMinYear);
    d3.select("#max-value").text(currentMaxYear);
    d3.select("#model-count").html(`Showing <strong>${filteredData.length}</strong> models`);
}

function updateDataAndCharts() {
    filteredData = allData.filter(d => d.year >= currentMinYear && d.year <= currentMaxYear);
    updateSliderDisplay();
    chartUpdateFunctions.forEach(updateFn => updateFn(filteredData));
}

function initializeCharts() {
    chartUpdateFunctions = [
        (data) => updateScatterplot("#chart-params", data, d => d.params, "Parameters (Log)"),
        (data) => updateScatterplot("#chart-compute", data, d => d.compute, "Compute (FLOPs)"),
        (data) => updateBubbleChart("#chart-bubble", data, d => d.time, d => d.dataset, "Training Time (Hours)", "Dataset Size")
    ];
    chartUpdateFunctions.forEach(fn => fn(filteredData));
}

function updateScatterplot(selector, dataset, yAccessor, yLabel) {
    d3.select(selector).selectAll("svg").remove();
    const chartData = dataset.filter(d => yAccessor(d) > 0);
    if (chartData.length === 0) return;
    const {svg, x, y} = setupCanvas(selector, chartData, yAccessor, yLabel);
    const color = selector === "#chart-params" ? "#69b3a2" : "#e69b3a";
    
    svg.append('g').selectAll("circle").data(chartData).join("circle")
        .attr("cx", d => x(d.date)).attr("cy", d => y(yAccessor(d))).attr("r", 5)
        .style("fill", color).style("stroke", "#fff").style("opacity", 0.8)
        .on("mouseover", (event, d) => showTooltip(event, `${d.name}<br>Value: ${formatValue(yAccessor(d))}`))
        .on("mouseout", hideTooltip);
}

function updateBubbleChart(selector, dataset, yAccessor, rAccessor, yLabel, rLabel) {
    d3.select(selector).selectAll("svg").remove();
    const chartData = dataset.filter(d => yAccessor(d) > 0 && rAccessor(d) > 0);
    if (chartData.length === 0) return;
    const {svg, x, y} = setupCanvas(selector, chartData, yAccessor, yLabel);
    const r = d3.scaleSqrt().domain([0, d3.max(chartData, d => rAccessor(d))]).range([3, 35]);
    
    svg.append('g').selectAll("circle").data(chartData).join("circle")
        .attr("cx", d => x(d.date)).attr("cy", d => y(yAccessor(d))).attr("r", d => r(rAccessor(d)))
        .style("fill", "#4a90e2").style("fill-opacity", 0.6).style("stroke", "#fff")
        .on("mouseover", (event, d) => showTooltip(event, `<strong>${d.name}</strong><br>Time: ${formatValue(d.time)}h<br>Dataset: ${formatValue(d.dataset)}`))
        .on("mouseout", hideTooltip);
}

// --- MODIFICA QUI PER FISSARE L'ASSE Y ---
function setupCanvas(selector, chartData, yAccessor, yLabel) {
    const svg = d3.select(selector).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
    const x = d3.scaleTime()
        .domain(chartData.length > 0 ? d3.extent(chartData, d => d.date) : [new Date(currentMinYear,0,1), new Date(currentMaxYear,11,31)])
        .range([0, width]);
    
    const y = d3.scaleLog()
        .domain([d3.min(chartData, d => yAccessor(d)) * 0.5, d3.max(chartData, d => yAccessor(d)) * 2])
        .range([height, 0]);

    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x));
    
    // Logica corretta per i ticks della scala logaritmica: 
    // Mostriamo solo le etichette per le potenze di 10 (es. 1, 10, 100...)
    svg.append("g")
        .call(d3.axisLeft(y)
            .ticks(5) 
            .tickFormat(d => {
                const log10 = Math.log10(d);
                // Se il logaritmo in base 10 è un numero intero, è una potenza di 10
                if (Math.abs(log10 - Math.round(log10)) < 1e-10) {
                    return formatValue(d);
                }
                return ""; // Altrimenti non mostriamo l'etichetta
            })
        );
    
    svg.append("text").attr("x", width).attr("y", height + 45).text("Publication Date").style("text-anchor", "end").style("fill", "white");
    svg.append("text").attr("transform", "rotate(-90)").attr("y", -50).text(yLabel).style("text-anchor", "end").style("fill", "white");
    
    return {svg, x, y};
}

function showTooltip(event, content) {
    d3.select("#tooltip").style("opacity", 1).html(content)
        .style("left", (event.pageX + 15) + "px").style("top", (event.pageY - 28) + "px");
}

function hideTooltip() { d3.select("#tooltip").style("opacity", 0); }