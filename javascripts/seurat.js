(function(){

	//Maximum worker threads
	const _threads = 12;
	
	//Generations (number of shapes)
	const _generations = 2500;
		
	//Full Arc in radians
	const _360 = 2 * Math.PI;

	//Maximum dimensions for random shapes
	const _guesswidth  = 30;
	const _guessheight = 30;
	const _guessradius = 10;
	const _guesslength = 50;

	//Image sizes variables
	var _width;
	var _height;
	var _size;
	
	//Set to true if there is a crop image loaded:
	var _crop = false;

	//0->Circles 1->Lines 2->Rectangles
	var _shape = 0;

	//SVG element
	var _svg = document.getElementById("s");
	var _scale = 1;

	//0->Polar 1->Grid
	var _coords = 1;
	var _getCoords;
	
	//The palette of the image
	var _colors = [];
	var _colorshex = [];
	var _colornum = 0;

	
	//------------------------------------------------------------------
	//Event builder:
	var workerEvent = function(source,callbackResult,callbackReady,callbackTest) {
		return function(event) {
			var data = event.data;
			switch (data.type) {
				case "message":
					console.log("[message]",source,data.data);
					break;
				case "ready":
					//console.log("[ready]",source,data);
					callbackReady(data.data);		
					break;		
				case "result":
					callbackResult(data.data);
					break;
				case "test":
					callbackTest(source,data.data);
					break;

			}
		};	
	};
	
	//------------------------------------------------------------------
	//Shape chooser
	var getShapeStyle = function() {
		var url = location.href;
		var idx = url.indexOf('?shape=');
		var shp = idx>-1?url.substr(idx+7):"0";
		var els = document.getElementsByTagName("input");
		for(var i=0,l=els.length;i<l;i++) {
			if (els[i].getAttribute("value")==shp) {
				els[i].setAttribute("checked","checked");
			}
		}
		_shape = parseInt(shp);
	}

	//------------------------------------------------------------------
	//Palette Extractor Worker
	var getColors = function(data,callback){
		var paletteworker = new Worker('/javascripts/paletteworker.js?random='+parseInt(Math.random()*100000).toString());
		paletteworker.onmessage = workerEvent("palette",callback);
		paletteworker.postMessage({'imagedata':data});
	};
	
	//------------------------------------------------------------------
	//Initializes a canvas width and height
	var initCanvas = function(canvas,width,height) {
		if (typeof canvas === "string") canvas = document.getElementById(canvas);
		canvas.width  = width||_width;
		canvas.height = height||_height;
		canvas.style.width  = canvas.width + 'px';
		canvas.style.height = canvas.height + 'px';
		return canvas;
	};
	
	//------------------------------------------------------------------
	//Initializes the context of a canvas
	var initContext = function(canvas) {
		var context = canvas.getContext("2d");
		context.fillStyle="#ffffff";
		context.fillRect(0, 0, canvas.width, canvas.height);
		return context;
	};
	
	//------------------------------------------------------------------
	//Creates a new canvas element and adds it to the DOM
	var newCanvas = function(container,context) {
		var canvas=document.createElement("canvas");
		container.appendChild(canvas);
		return initCanvas(canvas);
	};
	
	//Adds an HTML break for layout purposes
	var addBR = function(container) { container.appendChild(document.createElement("br")); }

	//------------------------------------------------------------------	
	//Random number helpers
	var rand1 = function(max){ return Math.floor(Math.random()*max); }
	var rand2 = function(min,max){ return Math.floor(Math.random() * (max - min + 1)) + min; }

	//------------------------------------------------------------------	
	//Puts a random shape on the image
	var putShape = function(context) {

		var o = getGridCoords();
		var c = _colorshex[rand1(_colornum)];
	
		switch(_shape) {
			case 0:	
				//Circle
				var r = rand2(1,_guessradius);
				context.beginPath();
				context.fillStyle = c;
				context.arc(o.x, o.y, r, 0, _360, false);
				context.closePath();
				context.fill();
				return JSON.stringify({"tag":"circle","cx":o.x*_scale,"cy":o.y*_scale,"r":r*_scale,"fill":"#"+c,"stroke":"none"});
			break;
			case 1:
				//Line
				var v = rand2(2,_guessradius*4);
				var n = rand1(360);
				var p = cartesian(n,v,o.x,o.y);
				context.beginPath();
				context.moveTo(o.x,o.y);
				context.lineTo(p.x,p.y);
				context.strokeStyle = c;
				context.stroke();
				return JSON.stringify({"tag":"line","x1":o.x*_scale,"y1":o.y*_scale,"x2":p.x*_scale,"y2":p.y*_scale,"stroke":c,"stroke-width":1*_scale});
			break;
			case 2:
				//Rectangle
				var w = rand2(2,_guessradius*2);
				var h = rand2(2,_guessradius*2);
				context.fillStyle = c;
				context.fillRect(o.x, o.y, w, h);
				return JSON.stringify({"tag":"rect","x":o.x*_scale,"y":o.y*_scale,"width":w*_scale,"height":h*_scale,"fill":c,"stroke":"none"});
			break;
		}
	};
	
	//------------------------------------------------------------------
	//Puts a shape in the SVG document
	var mapLayer = 0;
	var mapShape = function(shape) {
    	var tag = document.createElementNS( "http://www.w3.org/2000/svg", shape.tag );
    	for(p in shape) { if(p!="tag" && shape.hasOwnProperty(p)) tag.setAttribute(p,shape[p]); }
    	tag.setAttribute("id","shape"+(mapLayer++));
    	_svg.appendChild( tag );
	};

	//------------------------------------------------------------------
	//Gets an extra-large image for print
	var getPrint = function() {
		document.getElementById("ui").style.display = "none";
		window.print();
	};	

	//------------------------------------------------------------------
	//Converts polar coordinates to cartesian
	var cartesian = function(d,l,x,y){
		//Get base cartesian around 0,0 axis
	 	var x1 = Math.floor(l * Math.cos(d * 2 * Math.PI / 360)) + (x||0);
	 	var y1 = Math.floor(l * Math.sin(d * 2 * Math.PI / 360)) + (y||0);
		return {x:x1,y:y1};
	};

	var getPolarCoords = function() {
		var l = rand1(_height/2); //length of vector
		var d = rand1(360);		  //angle of vector
		var o = cartesian(d,l,_width/2,_height/2);
		return o;
	}

	var getGridCoords = function() {
		var x = rand1(_width); 
		var y = rand1(_height);
		var o = {x:x,y:y};
		return o;		
	}
	

	//------------------------------------------------------------------
	//Genetic Algorithm Mimic Workers
	var getMimic = function(imagedata,callback) {

		var generation = 0;
		var attempts = 0
		var loaded = 0;
		var ready = 0;

		var mimicworkers = [];

		var differences = [];
		var canvases = [];
		var contexts = [];
		var shapes = [];
		
		var attemptdifferences = [];
		var attemptcontexts = [];
		var attemptcanvases = [];
		var attemptshapes = [];
		
		
		var container = document.getElementById("a");
		var cropcanvas  = document.getElementById("h");
		var bestcanvas  = initCanvas("b");
		var bestcontext = initContext(bestcanvas);
		var bestshapes = [];
		var bestdifference = 0;
		
		//- - - - - - - - - - - - - - - - - - - -
		//Loads the difference from the thread, and checks if all threads from this generation are finished 
		var checkThread = function(data) {
			differences[loaded] = data;			
			if(++loaded>=_threads) {
				nextAttempt(chooseBest(differences));
			};
		};		
		
		//- - - - - - - - - - - - - - - - - - - -
		//Chooses the best image from a set
		var chooseBest = function(diffs) {
			var bestdiff=diffs[0], bestw=0;
			for(var w=1;w<_threads;w++) {
				if (bestdiff>diffs[w]) {
					bestdiff=diffs[w];
					bestw=w;
				}
			}
			return bestw;
		};

		//- - - - - - - - - - - - - - - - - - - - 
		//Assigns the best from all the attempts as the next generation start point
		var assignBest = function(bestw){
			if (generation<5 || attemptdifferences[bestw]<bestdifference) {
				bestdifference = attemptdifferences[bestw];
				bestcontext.drawImage(attemptcanvases[bestw], 0, 0, _width, _height);
				bestshapes = attemptshapes[bestw].slice();
			}
			for(var w=0;w<_threads;w++) {
				contexts[w].drawImage(bestcanvas, 0, 0, _width, _height);
				shapes[w] = bestshapes.slice();
			}
		}
		
		//- - - - - - - - - - - - - - - - - - - -
		//Starts the next attempt to find a good match
		var nextAttempt = function(bestw) {
			attemptdifferences[attempts] = differences[bestw];
			attemptcontexts[attempts].drawImage(canvases[bestw], 0, 0, _width, _height);
			attemptshapes[attempts] = shapes[bestw].slice();
			if(++attempts<_threads) {
				loaded = 0;
				for(var w=0;w<_threads; w++) {
					contexts[w].drawImage(bestcanvas, 0, 0, _width, _height);
					shapes[w]=bestshapes.slice();
					shapes[w].push(putShape(contexts[w]));
					var messagedata = {'type':'diff','imagedata':contexts[w].getImageData(0, 0, _width,_height)};
					mimicworkers[w].postMessage(messagedata);
				}
			} else {
				if(generation%100===0) console.log("Generation " + generation + " of " + _generations + " complete!");
				assignBest(chooseBest(attemptdifferences));
				nextGen();
			}
		}
		
		//- - - - - - - - - - - - - - - - - - - -		
		//Goes to the next generation
		var start = (new Date())-0;
		var nextGen = function() {
			loaded = 0;
			attempts = 0;
			generation++;
			if(generation<_generations) {
				for(var w=0;w<_threads; w++) {
					putShape(contexts[w],cropcanvas);
					var messagedata = {'type':'diff','imagedata':contexts[w].getImageData(0, 0, _width,_height)};
					mimicworkers[w].postMessage(messagedata);
				}
			} else {
				//Process is finished.
				delete mimicworkers;
				var end = (new Date()) - 0;
				console.log((end - start)/1000);
				for(var bs=0,bsl=bestshapes.length;bs<bsl;bs++) mapShape(JSON.parse(bestshapes[bs]));
				callback();
			}
		};
		
		//- - - - - - - - - - - - - - - - - - - -
		//Checks if all the workers have been initialized
		var checkInit = function() {
			if(++ready===_threads) {
				console.log("All ready!");
				nextGen();
			}
		}
		
		//- - - - - - - - - - - - - - - - - - - -
		//Initialize Try canvases
		for(var w=0;w<_threads; w++) {

			//Create a shell canvas for the scratch
			canvases[w] = newCanvas(container);
			contexts[w] = initContext(canvases[w]);
			differences[w] = 0;
			shapes[w] = [];

			if (w%6===5) addBR(container);
			
		}
		
		addBR(container);

		//- - - - - - - - - - - - - - - - - - - -
		//Initialize Attempt canvases		
		for(var w=0;w<_threads; w++) {
						
			//Create a shell canvas for the attempts
			attemptcanvases[w] = newCanvas(container);
			attemptcontexts[w] = initContext(attemptcanvases[w]);
			attemptdifferences[w] = 0;
			attemptshapes[w] = [];
			
			if (w%6===5) addBR(container);
		}

		//- - - - - - - - - - - - - - - - - - - -		
		//Initialize the worker threads
		for(var w=0;w<_threads; w++) {		
			//Make the workers:
			mimicworkers[w] = new Worker('/javascripts/mimicworker.js?random='+parseInt(Math.random()*100000).toString());
			mimicworkers[w].onmessage = workerEvent("mimic [" + w + "]",checkThread,checkInit,checkTest);
			
			//Start the process for the worker
			mimicworkers[w].postMessage({'type':'init','imagedata':imagedata});
			
		}
		
		function checkTest(source,data) {
			console.log(source,data);			
		}


	}
	

	
	//------------------------------------------------------------------
	//Kicks off the mimic process
	function mimic(small,crop) {

		var mapCopy = function(context) {
			var orig = context.getImageData(0, 0, _width, _height);
			var image = context.getImageData(0, 0, _width, _height);
			var data = image.data;
			var cols = [];
			var p = initContext(initCanvas("p",_colornum*52,_height));
			var m = initContext(initCanvas("m"));
			if (_colornum && typeof _colors[0] === "string") {
				_colorshex = _colors;
				for(var c=0;c<_colornum;c++) {
					var s = _colors[c].substr(1);
					cols.push({r:parseInt(s.substr(0,2),16),g:parseInt(s.substr(2,2),16),b:parseInt(s.substr(4,2),16)});
					p.fillStyle=_colors[c];
					p.fillRect(c*52,0,c*52+50,c*52+240);
				}
			} else {
				cols = _colors;
				for(var c=0;c<_colornum;c++) {
					_colorshex[c] = _colors[c].color;
				}
			}

			for(var i=0;i<_colornum;i++) {
				p.fillStyle=_colorshex[i];
				p.fillRect(i*52,0,i*52+50,i*52+_height);
			}
			
			var sq = function(x){return x*x;};
			var getPixelDifference = function(r1,g1,b1,r2,g2,b2) { return (sq(r1-r2) + sq(g1-g2) + sq(b1-b2)); };

			for(var i=0;i<_size;i+=4) {
				var r=data[i],g=data[i+1],b=data[i+2];
				var bestdiff = getPixelDifference(r,g,b,cols[0].r,cols[0].g,cols[0].b);
				for(var bestc=0,c=1;c<_colornum;c++) {
					var diff = getPixelDifference(r,g,b,cols[c].r,cols[c].g,cols[c].b);
					if (diff<bestdiff) {
						bestdiff=diff;
						bestc=c;
					}
				}
				data[i+0] = cols[bestc].r;
				data[i+1] = cols[bestc].g;
				data[i+2] = cols[bestc].b;
			}
			m.putImageData(image,0,0);
			return orig;
		};
		
		//- - - - - - - - - - - - - - - - - - - -
		var initDimensions = function(width,height) {
			_width = _width||width;
			_height = _height||height;
			_size = _size||_width*_height*4;
		}
		
	

		//- - - - - - - - - - - - - - - - - - - -		
		//Loads the diamond cropping image
		var loadCrop = function(src,callback) {
			var crop = new Image(), c;
			_crop = true;
			crop.onload = function() {
				initDimensions(crop.width,crop.height);
				c = initCanvas("h").getContext("2d");
				c.drawImage(crop, 0, 0);
				callback();
			}
			crop.src = src;
		}

		
		//- - - - - - - - - - - - - - - - - - - -
		//Loads the thumbnail for fitness comparissons 
		var loadThumb = function(src) {
			var thumb = new Image(), c;
			thumb.onload = function() {
				initDimensions(thumb.width,thumb.height);
				c = initContext(initCanvas("c"));
				c.drawImage(thumb, 0, 0);
				c.drawImage(document.getElementById("h"),0,0,_width,_height);

				//Start the process!
				getMimic(mapCopy(c), function(){
					console.log('All done!');
				});
			}
			thumb.src = src;
		}
		
		/*
		loadCrop(crop,function(){
			loadThumb(small);
		});
		*/

		//- - - - - - - - - - - - - - - - - - - -
		//Loads the thumbnail for fitness comparissons 
		var loadImage = function(src) {
			var image = new Image(), c;
			image.onload = function() {
				initDimensions(image.width,image.height);
				c = initContext(initCanvas("c"));
				c.drawImage(image, 0, 0);
				c.drawImage(document.getElementById("h"),0,0,_width,_height);
				var data = c.getImageData(0, 0, _width,_height);
				getColors(data,function(colors) {
					_colors   = colors;
					_colornum = colors.length;
					_scale = parseInt(window.innerHeight/_height);
				    _svg.setAttribute( "width", _scale*_width);
				    _svg.setAttribute( "height", _scale*_height);
					_svg.style.display = "none";
					getMimic(mapCopy(c), function(){
						_svg.style.display = "block";
						console.log('All done!');
					});
				});

			}
			image.src = src;
		}		
		
		if(!crop) document.getElementById('h').style.display="none";		
		
		loadImage(small);
	
	}

	//Load the mondrian image, Start the process
	mimic('temp/daey_fl_2005-01-01.jpg');
	
})();

		/*
		//- - - - - - - - - - - - - - - - - - - -
		//loads the image to get the palette in a canvas element
		var loadImage = function(src,callback) {
			var img = new Image();
			img.onload = function() {
				var C = document.getElementById("c");
				var c = C.getContext('2d');
				C.width = img.width;
				C.height = img.height;
				c.drawImage(img, 0, 0);
				//Get the palette
				var data = c.getImageData(0, 0, img.width, img.height);
				getColors(data,function(colors) {
					_colors   = colors;
					_colornum = colors.length;
					var P = document.getElementById("p");
					var p = P.getContext('2d');
					P.width = _colornum*52;
					P.height = 240;
					for(var i=0,j=[];i<_colornum;i++) {
						var k = 'rgba('+[_colors[i].r,_colors[i].g,_colors[i].b].join(',')+',1.0)';
						p.fillStyle=k;
						p.fillRect(i*52,0,i*52+50,i*52+240);
						j.push(k);
					}
					console.log(j.join(' '));
						 
					callback();					
				});
			}
			img.src = src;
		}
		*/	