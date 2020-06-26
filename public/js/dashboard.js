var allMaterial = document.getElementById("allMaterial");
console.log(allMaterial.children);
if(allMaterial.children.length==0){
    var h3 = document.createElement('h3');
    h3.textContent = "Nothing to show!!!";
    h3.classList.add('runtimeEmpty');
    allMaterial.appendChild(h3);
}
