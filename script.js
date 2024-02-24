const linkedinBtn = document.getElementById('linkedin-btn');
const githubBtn = document.getElementById('github-btn');
const cvBtn = document.getElementById('cv-btn');

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