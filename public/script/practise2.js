var container_content =document.getElementById("boxs");
var image = ['g', 'a', 'e', 'h'];
var b = image.length;

function prev() {
	if (b<image.length) {
		b = b+1;
	}else{
		b = 1;
	}
	container_content.innerHTML = "<img src="+image[b-1]+".jpg>"; 
}

function nxt() {
	if (b<image.length + 1 && b>1 ) {
		b = b-1;
	} else {
		b = image.length;
	}
	container_content.innerHTML = "<img src ="+image[b-1]+".jpg>";
}
setInterval(nxt, 3000);

var containers_content =document.getElementById("own");
var imge = ['person_1', 'person_3', 'person_2', 'person_4'];
var a = imge.length;

function prv() {
	if (a<imge.length) {
		a = a+1;
	}else{
		a = 1;
	}
	containers_content.innerHTML = "<img src="+imge[a-1]+".jpg>"; 
}

function net() {
	if (a<imge.length + 1 && a>1 ) {
		a = a-1;
	} else {
		a = imge.length;
	}
	containers_content.innerHTML = "<img src ="+imge[a-1]+".jpg>";
}
setInterval(net, 3000);

$(".message a").click(function(){
	$("form").animate({
		height: "toggle", opacity: "toggle"
	},"slow");
});

