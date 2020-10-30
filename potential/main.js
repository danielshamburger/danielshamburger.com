$(document).ready(function(){
		
	// http://stackoverflow.com/questions/7717527/jquery-smooth-scrolling-when-clicking-an-anchor-link/7717572#7717572?newreg=16ca424bc4024b21a4fcc728ea6451d5
	$('a').click(function(){
	    $('html, body').animate({
	        scrollTop: $( $.attr(this, 'href') ).offset().top
	    }, 500);
	    return false;
	});

	$(document).scroll(function() {
	    if ( $(document).scrollTop() > ($('section.hero').height() / 2 ) && $(document).scrollTop() < ($('section.hero').height() * 1.3 ) ) {
	    	$('.viewport').addClass('black');
	    } else if ( $('.viewport').hasClass('black') ) {
	    	$('.viewport').removeClass('black');
	    }
	});

});