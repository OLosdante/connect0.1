
let homeBtn = document.getElementById("homebtn")
let aboutBtn = document.getElementById("aboutbtn")
let jobBtn = document.getElementById("jobbtn")
let blogBtn = document.getElementById("blogbtn")


let remoteBtn = document.getElementById("contbtnr")
let onsiteBtn = document.getElementById("contbtno")
let hybrideBtn = document.getElementById("contbtnh")
let intershipBtn = document.getElementById("contbtni")


let mobileNav = document.getElementById("mobilenav")
let mobile = document.getElementById("mobileN")


mobileNav.addEventListener("click", function(){
    mobile.style.display = "flex"
})


aboutBtn.addEventListener("click",function(){
    window.location.href = "aboutus.html";
})
homeBtn.addEventListener("click", function(){
    window.location.href = "index.html";
})
jobBtn.addEventListener("click", function(){
    window.location.href = "jobs.html"
})
blogBtn.addEventListener("click", function(){
    window.location.href = "blogs.html"
})



if (remoteBtn) {
    remoteBtn.addEventListener("click", function(){
        window.location.href = "remote.html"
    })
}
if (onsiteBtn) {
    onsiteBtn.addEventListener("click", function(){
        window.location.href = "onsite.html"
    })
}
if (hybrideBtn) {
    hybrideBtn.addEventListener("click", function(){
        window.location.href = "hybride.html"
    })
}
if (intershipBtn) {
    intershipBtn.addEventListener("click", function(){
        window.location.href = "internships.html"
    })
}

