// Dati di esempio per la popolazione mondiale per regione (in milioni)
const populationData = {
    years: [2000, 2010, 2025],
    regions: [
        { name: "Asia", color: "#4e79a7", values: [3714, 4164, 4718] },
        { name: "Africa", color: "#f28e2c", values: [811, 1042, 1482] },
        { name: "Europa", color: "#e15759", values: [727, 740, 748] },
        { name: "Americhe", color: "#76b7b2", values: [838, 934, 1025] },
        { name: "Oceania", color: "#59a14f", values: [31, 37, 44] }
    ]
};

// Configurazione del grafico
const config = {
    width: 600,
    height: 400,
    padding: { top: 40, right: 40, bottom: 60, left: 60 },
    circleRadius: 8, // Raggio base per ogni cerchio (100 milioni di persone)
    transitionDuration: 1000
};

// Variabili globali
let currentStep = 0;
let svg, xScale, yScale;

// Funzione per inizializzare il grafico
function initChart() {
    // Seleziona il contenitore
    const container = d3.select("#chart");
    
    // Crea SVG
    svg = container.append("svg")
        .attr("width", config.width)
        .attr("height", config.height)
        .attr("viewBox", `0 0 ${config.width} ${config.height}`)
        .attr("preserveAspectRatio", "xMidYMid meet");
    
    // Crea gruppo principale
    const g = svg.append("g")
        .attr("transform", `translate(${config.padding.left}, ${config.padding.top})`);
    
    // Crea scale
    const chartWidth = config.width - config.padding.left - config.padding.right;
    const chartHeight = config.height - config.padding.top - config.padding.bottom;
    
    // Scala X per le regioni
    xScale = d3.scaleBand()
        .domain(populationData.regions.map(d => d.name))
        .range([0, chartWidth])
        .padding(0.2);
    
    // Scala Y per la popolazione (in milioni)
    yScale = d3.scaleLinear()
        .domain([0, 5000]) // Massimo 5 miliardi
        .range([chartHeight, 0]);
    
    // Assi
    // Asse X
    g.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0, ${chartHeight})`)
        .call(d3.axisBottom(xScale))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em");
    
    // Asse Y
    g.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(yScale).tickFormat(d => d >= 1000 ? `${d/1000}B` : `${d}M`))
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -40)
        .attr("x", -chartHeight/2)
        .attr("dy", "1em")
        .attr("fill", "#000")
        .style("text-anchor", "middle")
        .style("font-weight", "bold")
        .text("Popolazione");
    
    // Etichetta per l'asse X
    g.append("text")
        .attr("class", "x-axis-label")
        .attr("x", chartWidth / 2)
        .attr("y", chartHeight + 50)
        .attr("text-anchor", "middle")
        .style("font-weight", "bold")
        .text("Regione");
    
    // Titolo del grafico (verrà aggiornato)
    g.append("text")
        .attr("class", "chart-title")
        .attr("x", chartWidth / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .style("font-size", "18px")
        .style("font-weight", "bold")
        .text("Popolazione Mondiale per Regione (2000)");
    
    // Crea i gruppi per ogni regione
    const regionGroups = g.selectAll(".region-group")
        .data(populationData.regions)
        .enter()
        .append("g")
        .attr("class", "region-group")
        .attr("transform", d => `translate(${xScale(d.name) + xScale.bandwidth()/2}, 0)`);
    
    // Crea i cerchi per ogni regione
    regionGroups.selectAll("circle")
        .data(d => {
            // Per ogni regione, crea tanti cerchi quanti sono i valori (ogni cerchio = 100 milioni)
            const circles = [];
            const value = d.values[0]; // Valore iniziale (anno 2000)
            const numCircles = Math.max(1, Math.floor(value / 100));
            
            for (let i = 0; i < numCircles; i++) {
                circles.push({
                    region: d.name,
                    color: d.color,
                    value: value,
                    index: i,
                    totalCircles: numCircles
                });
            }
            return circles;
        })
        .enter()
        .append("circle")
        .attr("class", "population-circle")
        .attr("cx", 0)
        .attr("cy", (d, i) => {
            // Dispone i cerchi in colonna
            const row = Math.floor(i / 5);
            const col = i % 5;
            return chartHeight - 40 - (row * 30) + (col * 5);
        })
        .attr("r", config.circleRadius)
        .attr("fill", d => d.color)
        .attr("opacity", 0.9)
        .attr("stroke", "white")
        .attr("stroke-width", 1.5)
        .attr("data-region", d => d.region);
    
    // Aggiungi etichette per le regioni
    regionGroups.append("text")
        .attr("class", "region-label")
        .attr("y", chartHeight + 25)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .text(d => d.name);
    
    // Aggiungi valori numerici
    regionGroups.append("text")
        .attr("class", "region-value")
        .attr("y", chartHeight + 40)
        .attr("text-anchor", "middle")
        .style("font-size", "11px")
        .style("fill", "#666")
        .text(d => `${(d.values[0]/1000).toFixed(1)}B`);
    
    // Aggiorna la legenda
    updateLegend(0);
}

// Funzione per aggiornare il grafico in base allo step
function updateChart(stepIndex) {
    currentStep = stepIndex;
    const year = populationData.years[stepIndex];
    
    // Aggiorna il titolo
    d3.select(".chart-title")
        .transition()
        .duration(config.transitionDuration / 2)
        .text(`Popolazione Mondiale per Regione (${year})`);
    
    // Aggiorna l'anno nella legenda
    document.getElementById("current-year").textContent = year;
    
    // Per ogni regione
    populationData.regions.forEach((region, regionIndex) => {
        const value = region.values[stepIndex];
        const numCircles = Math.max(1, Math.floor(value / 100));
        
        // Seleziona tutti i cerchi di questa regione
        const circles = d3.selectAll(`.population-circle[data-region="${region.name}"]`);
        const existingCircles = circles.size();
        
        // Se abbiamo bisogno di più cerchi
        if (numCircles > existingCircles) {
            // Aggiungi nuovi cerchi
            const parentGroup = d3.selectAll(`.region-group`).filter((d, i) => i === regionIndex);
            const chartHeight = config.height - config.padding.top - config.padding.bottom;
            
            for (let i = existingCircles; i < numCircles; i++) {
                parentGroup.append("circle")
                    .attr("class", "population-circle")
                    .attr("cx", 0)
                    .attr("cy", chartHeight - 40)
                    .attr("r", 0) // Inizia con raggio 0
                    .attr("fill", region.color)
                    .attr("opacity", 0)
                    .attr("stroke", "white")
                    .attr("stroke-width", 1.5)
                    .attr("data-region", region.name)
                    .transition()
                    .delay((i - existingCircles) * 100)
                    .duration(config.transitionDuration)
                    .attr("cy", () => {
                        const row = Math.floor(i / 5);
                        const col = i % 5;
                        return chartHeight - 40 - (row * 30) + (col * 5);
                    })
                    .attr("r", config.circleRadius)
                    .attr("opacity", 0.9);
            }
        }
        // Se abbiamo bisogno di meno cerchi
        else if (numCircles < existingCircles) {
            // Rimuovi cerchi extra
            circles.filter((d, i) => i >= numCircles)
                .transition()
                .duration(config.transitionDuration / 2)
                .attr("r", 0)
                .attr("opacity", 0)
                .remove();
        }
        
        // Aggiorna il valore numerico per la regione
        d3.selectAll(".region-value")
            .filter((d, i) => i === regionIndex)
            .transition()
            .duration(config.transitionDuration)
            .text(`${(value/1000).toFixed(1)}B`);
    });
    
    // Aggiorna la legenda
    updateLegend(stepIndex);
    
    // Effetto visivo: evidenzia la regione con la crescita maggiore
    if (stepIndex > 0) {
        highlightMaxGrowth(stepIndex);
    }
}

// Funzione per evidenziare la regione con la crescita maggiore
function highlightMaxGrowth(stepIndex) {
    // Calcola la crescita per ogni regione
    let maxGrowth = 0;
    let maxGrowthRegion = "";
    
    populationData.regions.forEach(region => {
        const growth = region.values[stepIndex] - region.values[0];
        const growthPercent = (growth / region.values[0]) * 100;
        
        if (growthPercent > maxGrowth) {
            maxGrowth = growthPercent;
            maxGrowthRegion = region.name;
        }
    });
    
    // Rimuovi evidenziazione precedente
    d3.selectAll(".population-circle")
        .transition()
        .duration(300)
        .attr("stroke-width", 1.5)
        .attr("stroke", "white");
    
    // Evidenzia la regione con crescita maggiore
    if (maxGrowthRegion) {
        d3.selectAll(`.population-circle[data-region="${maxGrowthRegion}"]`)
            .transition()
            .duration(300)
            .attr("stroke-width", 3)
            .attr("stroke", "#f72585");
    }
}

// Funzione per aggiornare la legenda
function updateLegend(stepIndex) {
    const year = populationData.years[stepIndex];
    const totalPopulation = populationData.regions.reduce((sum, region) => sum + region.values[stepIndex], 0);
    
    document.getElementById("legend-label").textContent = 
        `Popolazione totale: ${(totalPopulation/1000).toFixed(1)} miliardi`;
}


// Funzione per aggiornare l'indice di navigazione
function updateScrollIndex(stepIndex) {
    
    d3.selectAll(".index-dot").classed("active", true);
    
    const activeDot = d3.select('.index-dot[data-section="${getSectionFromStep(stepIndex)}"]');
    activeDot.classed("active", true);
    d3.selectAll(".index-title")
        .style("color", "rgba(255,255,255,0.8)")
        .style("font-weight", "600");
    d3.select(".index-title")
        .style("color", "4cc9f0")
        .style("font-weight", "600");
}

// Helper: converte stepIndex in section name
function getSectionFromStep(stepIndex) {
    switch(stepIndex) {
        case 0: return "hero";
        case 1: return "population";
        case 2: return "technology";
        case 3: return "environment";
        default: return "hero";
    }
}

// Helper: converte section in stepIndex
function getStepFromSection(section) {
    switch(section) {
        case "hero": return 0;
        case "population": return 1;
        case "technology": return 2;
        case "environment": return 3;
        default: return 0;
    }
}

// Funzione per aggiornare la barra di progresso
function updateProgressBar() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (scrollTop / scrollHeight) * 100;
    
    document.getElementById("progress-fill").style.width = `${scrolled}%`;
    document.getElementById("progress-text").textContent = `${Math.round(scrolled)}%`;
}

// Funzione per gestire il click sull'indice
function setupIndexClick() {
    d3.selectAll(".index-dot").on("click", function(event) {
        event.preventDefault();
        event.stopPropagation();

        const section = d3.select(this).attr("data-section");
        const stepIndex = getstepFromSection(section);
        
        // Trova l'elemento step corrispondente
        const targetStep = document.querySelector('.step[data-step="${stepIndex}"]');
        if (targetStep) {
            // Scroll fluido alla sezione
            targetStep.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
            
            // Aggiorna l'indice visivo
            updateScrollIndex(stepIndex);
            
            // Aggiorna il grafico
            if (section == "population"){
                updateChart(stepIndex - 1);
            }
            
        }
    });
}


// Funzione per inizializzare scrollama
function initScrollama() {
    const scroller = scrollama();
    
    scroller
        .setup({
            step: ".content-section",
            offset: 0.6,
            debug: false,
            progress: false
        })
        .onStepEnter(response => {
            const sectionId = response.element.id;
            let stepIndex = 0;

            switch(sectionId){
                case "hero":
                    stepIndex = 0;
                    break;
                case "section-population":
                    stepIndex = 1;
                    updateChart(0);
                    break;
                case "section-population":
                    stepIndex = 2;
                    updateChart(1);
                    break;
                case "section-population":
                    stepIndex = 3;
                    updateChart(2);
                    break;
            }
            
            updateScrollIndex(stepIndex);      // Indice laterale
            
            d3.selectAll(".content-section").classed("is-active", false);
            d3.select(response.element).classed("is-active", true);
        })
        
    
    // Barra di progresso globale
    window.addEventListener("scroll", updateProgressBar);
    
    // Click sull'indice
    setupIndexClick();
    
    // Ridimensionamento
    window.addEventListener("resize", scroller.resize);
    
    // Inizializza la barra
    updateProgressBar();
}

// Inizializza tutto quando la pagina è caricata
document.addEventListener("DOMContentLoaded", function() {
    // 1. Inizializza il grafico
    initChart();
    
    // 2. Inizializza scrollama
    initScrollama();
    
    // 3. Aggiungi interazione ai cerchi (opzionale)
    d3.select("#chart").on("mousemove", function(event) {
        // Puoi aggiungere tooltip qui se vuoi
    });
    
    console.log("Demo caricata! Fai scorrere la pagina per vedere l'effetto.");
});

