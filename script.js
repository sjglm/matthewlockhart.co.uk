const linkedinBtn = document.getElementById('linkedin-btn');
const githubBtn = document.getElementById('github-btn');
const cvBtn = document.getElementById('cv-btn');
const goToTopBtn = document.getElementById('goToTopBtn');

linkedinBtn.addEventListener('mouseenter', ()=>{
    linkedinBtn.style.backgroundColor = '#0056b3'
});
linkedinBtn.addEventListener('mouseleave', () => {
    linkedinBtn.style.backgroundColor = '#0077b5'; 
});

githubBtn.addEventListener('mouseenter', ()=>{
    githubBtn.style.backgroundColor = '#dcdcdc'
});
githubBtn.addEventListener('mouseleave', () => {
    githubBtn.style.backgroundColor = '#f4f4f4'; 
});
cvBtn.addEventListener('mouseenter', ()=>{
    cvBtn.style.backgroundColor = '#7e3aff'
});
cvBtn.addEventListener('mouseleave', () => {
    cvBtn.style.backgroundColor = '#630fff'; 
});
goToTopBtn.addEventListener('mouseenter', ()=>{
    goToTopBtn.style.backgroundColor = '#dcdcdc'
});
goToTopBtn.addEventListener('mouseleave', () => {
    goToTopBtn.style.backgroundColor = '#f4f4f4'; 
});

window.onscroll = function() {scrollFunction()};

function goToTop()
{
    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

function scrollFunction()
{
    if(document.body.scrollTop > 500 || document.documentElement.scrollTop > 500)
    {
        document.getElementById("goToTopBtn").style.display = "block";
    }
    else
    {
        document.getElementById("goToTopBtn").style.display = "none";
    }
}