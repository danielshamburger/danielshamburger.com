const dan = document.getElementById("daniel");
const name = document.getElementById("name");

name.addEventListener("mouseover", showDan);
name.addEventListener("mouseout", hideDan);

function showDan(e) {
    dan.style.display = 'block';

    setTimeout(function() {
        let x = e.clientX - name.offsetLeft;
        let y = e.clientY - name.offsetTop;
        
        dan.style.left = x + 'px';
        dan.style.top = y + 'px';
    }, 50);
    
}

function hideDan() {
    dan.style.display = 'none';
}