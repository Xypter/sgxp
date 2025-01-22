$("img").draggable();

// debug lines

$("#debug-x").css({
    position: "absolute",
    top: $("#container").height() / 2,
    width: $("#container").width(),
    height: "1px",
    "border-top": "1px red solid",
    "z-index": "10000",
    'pointer-events': 'none',
    'background': 'transparent'
});

$("#debug-y").css({
    position: "absolute",
    left: $("#container").width() / 2,
    height: $("#container").height(),
    width: "1px",
    "border-left": "1px red solid",
    "z-index": "10000",
    'pointer-events': 'none',
    'background': 'transparent'
});


$("#zoom-in").on("click", function(e)
{
    var container = $("#container");
    var image = $("#container img");
    
    var css = {};

    css.height = image.height() + (image.height() * 1);
    css.width = image.width() + (image.width() * 1);
    
    var x = Math.abs(image.position().left) + container.width() / 2;
    var y = Math.abs(image.position().top) + container.height() / 2;
    
    var ratio = css.width / image.width();
    
    var newX = x * ratio;
    var newY = y * ratio;
    
    css.left = image.position().left - (newX - x);
    css.top = image.position().top - (newY - y);
    
    image.css(css);
});

$("#zoom-out").on("click", function(e)
{
    var container = $("#container");
    var image = $("#container img");
    
    var css = {};

    css.height = image.height() + (image.height() * -.5);
    css.width = image.width() + (image.width() * -.5);
    
    var x = Math.abs(image.position().left) + container.width() / 2;
    var y = Math.abs(image.position().top) + container.height() / 2;
    
    var ratio = css.width / image.width();
    
    var newX = x * ratio;
    var newY = y * ratio;
    
    css.left = image.position().left - (newX - x);
    css.top = image.position().top - (newY - y);
    
    image.css(css);
});