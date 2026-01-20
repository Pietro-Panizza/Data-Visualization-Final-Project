//====================== HANDLING NAVIGATION AND PROGRESS======================

// Configurations
const CONFIG = {
    totalSections:7,
    transitionDuration: 1000
};

//Global state
let currentSection = 'hero';

//==================== NAVIGATION FUNCTION=============================
//Update the navigation index
function updateScrollIndex(sectionId){
    
    d3.selectAll(".index-dot").classed("active",false);

    d3.select(`.index-dot[data-section="${sectionId}"]`).classed("active", true);

    d3.selectAll(".index-title").style("color", "rgba(255,255,255,0.8)").style("font-weight","500");
    
    const activeTitle = d3.select(`.index-dot[data-section="${sectionId}"].index-title`);
    if(!activeTitle.empty()){
        activeTitle.style("color", "#4cc9f0").style("font-weight", "600");
    }
}

//update the progress bar
function updateProgressBar(){
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (scrollTop / scrollHeight) * 100;

    document.getElementById("progress-fill").style.width = `${scrolled}%`;
    document.getElementById("progress-text").textContent = `${Math.round(scrolled)}%`;
}

//Configure click on the index
function setupIndexClick(){
    d3.selectAll(".index-dot").on("click", function(event){
        event.preventDefault();

        const section = d3.select(this).attr("data-section");

        //find target element
        let targetElement;
        if (section === 'hero'){
            targetElement = document.getElementById('hero');
        } else {
            targetElement = document.getElementById(`section-${section}`);
        }
        if (targetElement){
            targetElement.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });

            currentSection = section;
            updateScrollIndex(section);

            if(window.handleSectionChange){
                window.handleSectionChange(section);
            }

        }

    });
}

// Dynamic background management
function updateBackground(sectionelement){
    
}