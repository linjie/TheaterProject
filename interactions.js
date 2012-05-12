
		dojo.require("dijit.layout.ContentPane");
		dojo.require("dijit.layout.TabContainer");
		dojo.require("dijit.layout.BorderContainer");
		dojo.require("dijit.layout.AccordionContainer"); //we don't use this currently
		dojo.require("esri.dijit.Legend");
		dojo.require("esri.map");
		dojo.require("esri.tasks.find");
		dojo.require("esri.tasks.query");
		dojo.require("dijit.form.Form");
		dojo.require("dijit.form.CheckBox");
		dojo.require("dijit.form.Button");
		dojo.require("esri.dijit.TimeSlider");
		dojo.require("dijit.form.NumberTextBox");
		
		dojo.addOnLoad(init);
		// When the web page is loaded, dojo will call "init" function first which is defined below.
		
		var map;
		var feature;
	
		
		/*
			toggleMenu is the callback function related to the query menu shown on the right of the web page.
			This function is responsible for the changes of "+" and "-" when the user clicks on the "+" or "-".
			It displays or hides the corresponding query selection menu.
		*/
		function toggleMenu(menu, objID) {
			if (!document.getElementById) return;
				// the first line is supported by Firefox, Chrome, but not Internet Explorer.
				var ob = document.getElementById(objID).style;
				ob.display = (ob.display == 'block')?'none': 'block';
				//the next line is messed up. We want an ndash, not --, but I can't get it to recognize it properly.
				menu.innerHTML = (ob.display == 'block')? menu.innerHTML.replace("+","--") : menu.innerHTML.replace("--","+") ;
			}
		/*
			This is the callback function when the web page is loaded. 		
		
		*/
			function init(){
                // load the map

                map = new esri.Map("mapPane", {"logo":false});
				var legendLayers = []; //we don't ever use this list, and as far as I can tell our map only has one layer
				
                var basemapURL = "https://arcgis.its.carleton.edu/ArcGIS/rest/services/ItalyTheaters/MapServer";
                var basemap = new esri.layers.ArcGISDynamicMapServiceLayer(basemapURL);
                map.addLayer(basemap);			
			
				var timeExtent = new esri.TimeExtent();
				timeExtent.startTime = new Date(0,0,1);
				timeExtent.startTime.setFullYear('-500');
				timeExtent.endTime = dojo.date.add(timeExtent.startTime,"year", 1000);
			
				initSlider(timeExtent);
				//dojo.connect(map, "onLayerAddResult", initSlider);

				
			}
			
			function initSlider(timeExtent) {
				//alert(dojo.byId("timesliderDiv"));
				var tsDiv = dojo.create("div", null, dojo.byId('timesliderDiv'));
				//alert(tsDiv);
				var timeSlider = new esri.dijit.TimeSlider({style: "width: 90%;",id:'timeSlider'},tsDiv);
				map.setTimeSlider(timeSlider);

				timeSlider.setThumbCount(1);
				
				// change unit later
				timeSlider.createTimeStopsByTimeInterval(timeExtent,10,'esriTimeUnitsYears');
			//	timeSlider.setThumbIndexes([0,1]);
				timeSlider.setThumbMovingRate(1000);
				timeSlider.startup();
				
				var labels = dojo.map(timeSlider.timeStops, function(timeStop,i){ 
				if(i%5 === 0){
					var year = timeStop.getUTCFullYear(); //should we add these labels back in at some point???
					// if (year==-500){
						// return "500BCE";
					// }
					// if  (year<0) {return -year}
					// if  (year==500) {
						// return "500CE";
					// }
					// if (year>=0) {return year}
					return year;
				}
				else{
					return "";
				}
				});      
				timeSlider.setLabels(labels);
				
				var startValString = timeExtent.startTime.getUTCFullYear(); //parse it later to display BC/AD				
				var endValString = timeExtent.endTime.getUTCFullYear();
				var selected = ConstructQuery();
				if  (selected!=""){
					selected += " AND ";
				}
				selected += " (Date_early <= "+ endValString+" AND Date_late >="+ startValString +")";
				alert("query constructed "+selected);
				var queryTask, query;
				queryTask = new esri.tasks.QueryTask("https://arcgis.its.carleton.edu/ArcGIS/rest/services/ItalyTheaters/MapServer/0");
				//queryTasks executes queries
				query = new esri.tasks.Query();
                query.returnGeometry = true;
                query.outFields = ["Name","Style", "Type","Province","Town","Cavea_2","Seating_2", "Date_early", "Date_late"];
         
                
                query.where = selected;
	
				alert("before execute");
				
                queryTask.execute(query);
			
				dojo.connect(queryTask,"onComplete", function(fset){
					
					var infoTemplate = new esri.InfoTemplate("${Name}", "${*}"); 
					var colors=[[27,158,119,0.75],[217,95,2,0.75],[117,112,179,0.75],[0,255,0,0.5],[173,255,47,0.5],[160,32,240,0.5],[0,100,0,0.5],[255,20,147,0.5]];
					var htmlColors =["rgb(27,158,119)","rgb(217,95,2)","rgb(117,112,179)","rgb(0,255,0)","rgb(173,255,47)","rgb(160,32,240)","rgb(0,100,0)","rgb(255,20,147)"];
					var shapes = ['CIRCLE', 'DIAMOND', 'SQUARE'];
					var colorDict = {};
					var shapeDict = {};
					var nameList = ['Greek', 'Roman', 'Unknown'];
					var typeList = ['Open-air', 'Roofed', 'Unknown'];
					for (var i=0; i<nameList.length; i++) {		
						colorDict[nameList[i]] = colors[i];
						//this changes the shapes with the color...how to seperate them?
						shapeDict[typeList[i]] = shapes[i];
					}
			
					var resultFeatures= fset.features;

					var numFeatures = resultFeatures.length;
				
					var hasDrawn = new Array();
					for (var i=0; i<numFeatures; i++) {
						hasDrawn[i] = false;
					}
					var graphicsList = new Array();
					for (var i=0; i<numFeatures; i++) {
						graphicsList[i] = resultFeatures[i];
						var style = resultFeatures[i].attributes.Style;
						var type = resultFeatures[i].attributes.Type;
					
						if (nameList.indexOf(style) <= -1) {
							style = 'Unknown';
						}
						if (typeList.indexOf(type) <= -1) {
							type = 'Unknown';
						}
				
						var symbol = makeSymbol(colorDict[style], shapeDict[type]);	
						
						graphicsList[i].setSymbol(symbol);
						graphicsList[i].setInfoTemplate(infoTemplate);
					}
				
					// for( prop in feature) {alert(prop);}
					// var str = "";
					// for(prop in fset.features[0].attributes)
					// {
						// str+=prop + " value:"+ resultFeatures[0].attributes[prop]+"\n";//Concate prop and its value from object
					// }
					// alert(str);
					dojo.connect(timeSlider, "onTimeExtentChange", function(timeExtent) {
						var startYear = Number(timeExtent.endTime.getUTCFullYear()); //parse it later to display BC/AD				
						
						for (var i=0; i<numFeatures; i++) {
							
							if (Number(resultFeatures[i].attributes.Date_early)<=startYear){
								
								if (!hasDrawn[i]) {
									
									map.graphics.add(graphicsList[i]);
									hasDrawn[i] = true;
								}
							}
							else if(hasDrawn[i]) {
								map.graphics.remove(graphicsList[i]);
								hasDrawn[i] = false;
							}
						}
						
						
					});
				});
				
				
				//for( prop in feature) {alert(prop);}
				//var str = "";
				//	for(prop in fset.features[0].attributes)
				//	{
				//		str+=prop + " value:"+ resultFeatures[0].attributes[prop]+"\n";//Concate prop and its value from object
				//	}
				//	alert(str);
				/*
				dojo.connect(timeSlider, "onTimeExtentChange", function(timeExtent) {
				var startValString = timeExtent.startTime.getUTCFullYear(); //parse it later to display BC/AD
				
				var endValString = timeExtent.endTime.getUTCFullYear();
				var selected = ConstructQuery();
				if  (selected!=""){
					selected += " AND ";
				}
				selected += " (Year_Early <= "+ endValString+" AND Year_Late >="+ startValString +")";
				executeQuery(selected);
				});*/
			}
			
			
			function updateSlider() {
				var startYear = dojo.byId('start_year').value;
				var endYear = dojo.byId('end_year').value;
				//@TODO: check here the validity of start_year and end_year
				var timeExtent = new esri.TimeExtent();
				timeExtent.startTime = new Date(0,0,1);
				timeExtent.startTime.setFullYear(startYear);
				timeExtent.endTime = dojo.date.add(timeExtent.startTime,"year", Number(endYear)-Number(startYear));
				//alert("after creating timeExtent");				
		
				
				if (dijit.byId('timeSlider')) {
					//alert("about to destroy");
					dijit.byId('timeSlider').destroy();
				}
				//alert("after destroy"); 
				initSlider(timeExtent);
				
				
			}
			
			
			
            function ConstructQuery(){
			var legend = document.getElementById("legendDiv");
					legend.innerHTML = "";
				var querySQL = ""; //this is what we return, will be an SQL query
				var attributeList = ["styleAll", "typeAll", "locationAll"];
				var sqlNameList = ["Style", "Type", "Province"]; //Why do we have two of the same lists? This seems unecessary...
				var divNameList = ["Style", "Type", "Province"];
				var nameList = ['Greek', 'Roman', 'Unknown'];
				var htmlColors =["rgb(27,158,119)","rgb(217,95,2)","rgb(117,112,179)","rgb(0,255,0)","rgb(173,255,47)","rgb(160,32,240)","rgb(0,100,0)","rgb(255,20,147)"];
				for (var j=0; j<3; j++) {
					var boo = document.getElementById("menu_"+divNameList[j]).style; //I like my name but maybe we can call this something more descriptive?
					if (boo.display == "none"){ //if the current menu category is not used, we don't care about it
						continue;
					}
					var nodelist = document.getElementsByName(attributeList[j]);
					
					var tempQuery = "";			
					if (dijit.byId(attributeList[j]).checked) {	//query all in a specific category
						for (var i=0; i<nodelist.length; i++) {
							tempQuery += sqlNameList[j] + " = '" + nodelist[i].value+"' OR ";
							if (j==0){
								if (i==0){
									legend.innerHTML +='<h3>Symbol color</h3>'
								}
							legend.innerHTML +='<input type="button" disabled="disabled" id="legendDiv" style="border-radius:10px; border: 0px solid #000;height: 12px; width: 12px;background-color:'+htmlColors[i]+';">&nbsp;'+nodelist[i].value+'</input><br>';
							}
							else if (j==1){
								if (i==0) {
									legend.innerHTML +='<h3>Symbol shape</h3>'
								}
								if (nodelist[i].value == 'Open-air'){
									legend.innerHTML +='<input type="button" disabled="disabled" id="legendDiv" style="border-radius:10px; border: 1px solid #000;height: 12px; width: 12px;background-color: white;">&nbsp;'+nodelist[i].value+'</input><br>';
								}
								else if (nodelist[i].value == 'Roofed'){
									legend.innerHTML +='<img src="roofedTypeIcon.jpg"/> '+nodelist[i].value+'<br>';
								}
								else {
									legend.innerHTML +='<img src="unknownTypeIcon.jpg"/> '+nodelist[i].value+'<br>';
								}
							}
						}
						tempQuery += sqlNameList[j] + " = ''";
						//tempQuery = tempQuery.slice(0, tempQuery.length-3);						
					}
					else {
						for (var i=0; i<nodelist.length; i++) {							
							if (dijit.byId(nodelist[i].id).checked) {		
								if (j==0){
									if (i==0){
										legend.innerHTML +='<h3>Symbol color</h3>'
									}
									legend.innerHTML +='<input type="button" disabled="disabled" id="legendDiv" style="border-radius:12px; border: 0px solid #000;height: 12px; width: 12px;background-color:'+htmlColors[i]+';">&nbsp;'+nodelist[i].value+'</input><br>';
								}
								else if (j==1){
									if (i==0) {
										legend.innerHTML +='<h3>Symbol shape</h3>'
									}
									if (nodelist[i].value == 'Open-air'){
										legend.innerHTML +='<input type="button" disabled="disabled" id="legendDiv" style="border-radius:10px; border: 1px solid #000;height: 12px; width: 12px;background-color: white;">&nbsp;'+nodelist[i].value+'</input><br>';
									}
									else if (nodelist[i].value == 'Roofed'){
										legend.innerHTML +='<img src="roofedTypeIcon.jpg"/> '+nodelist[i].value+'<br>';
									}
									else {
										legend.innerHTML +='<img src="unknownTypeIcon.jpg"/> '+nodelist[i].value+'<br>';
									}
								}
								tempQuery += sqlNameList[j] + " = '" + nodelist[i].value+"' OR ";
							}
						}
						if (tempQuery!=""){
							tempQuery = tempQuery.slice(0, tempQuery.length-3); //get rid of "OR" at end of query
						}
					}
					if (tempQuery!=""){
						querySQL += "(" + tempQuery + ") AND ";
					}	
				}
				var subquery = addSize(); //will add theater seating info
				if (querySQL!=""){
					if (subquery ==""){
						querySQL = querySQL.slice(0, querySQL.length-4); //get rid of "AND" at end of query
					}else{
						querySQL = querySQL + subquery;
					}
				}else{
					querySQL = subquery;
				}
				//alert(querySQL);

				return querySQL;			
			}
			
			function submitQuery() { //executes the SQL query
	
				executeQuery(ConstructQuery());
			}

			function makeSymbol(color, style) { //constructs markers for the map in different colors and shapes. We should add code to change size based in seating
				var symbol = new esri.symbol.SimpleMarkerSymbol();
				if (style == 'CIRCLE'){
					symbol.style = esri.symbol.SimpleMarkerSymbol.STYLE_CIRCLE;
				}
				else if (style == 'DIAMOND'){
					symbol.style = esri.symbol.SimpleMarkerSymbol.STYLE_DIAMOND;
				}
				else{
					symbol.style = esri.symbol.SimpleMarkerSymbol.STYLE_SQUARE;
				}
				symbol.setOutline(esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color([0,0,0,0.25]), 1));
				symbol.setSize(8);
				symbol.setColor(new dojo.Color(color));
				return symbol;
			}
			
            function executeQuery(querySQL){
				map.graphics.clear();
				var queryTask, query;
				queryTask = new esri.tasks.QueryTask("https://arcgis.its.carleton.edu/ArcGIS/rest/services/ItalyTheaters/MapServer/0");
				//queryTasks executes queries
				query = new esri.tasks.Query();
                query.returnGeometry = true;
                query.outFields = ["Name","Style", "Type","Province","Town","Cavea_2","Seating_2", "Date_early", "Date_late"];
         
                
                query.where = querySQL;
			//	alert(querySQL);
                //Execute query and call showResults on completion

                queryTask.execute(query, function(fset){
                    //create symbol for selected features
				
				    
					var resultFeatures = fset.features;
					//alert(resultFeatures[0].attributes.Style);
				//	var str = "";
					//for(prop in resultFeatures[0].attributes)
					//{
						//str+=prop + " value:"+ resultFeatures[0].attributes[prop]+"\n";//Concate prop and its value from object
					//}
					//alert(str);
					
					//I want to change infoTemplate so that it only displays field with values
                    var infoTemplate = new esri.InfoTemplate("${Name}", "${*}"); //infoTemplate is used to show the information about a theater when it is clicked on the map
                   //var legend = document.getElementById("legendDiv");
					//legend.innerHTML = "";
					var colors=[[27,158,119,0.75],[217,95,2,0.75],[117,112,179,0.75],[0,255,0,0.5],[173,255,47,0.5],[160,32,240,0.5],[0,100,0,0.5],[255,20,147,0.5]];
					var htmlColors =["rgb(27,158,119)","rgb(217,95,2)","rgb(117,112,179)","rgb(0,255,0)","rgb(173,255,47)","rgb(160,32,240)","rgb(0,100,0)","rgb(255,20,147)"];
					var shapes = ['CIRCLE', 'DIAMOND', 'SQUARE'];
					var colorDict = {};
					var shapeDict = {};
					var nameList = ['Greek', 'Roman', 'Unknown'];
					var typeList = ['Open-air', 'Roofed', 'Unknown'];
					for (var i=0; i<nameList.length; i++) {
							
						colorDict[nameList[i]] = colors[i];
						shapeDict[typeList[i]] = shapes[i];
						
						//legend.innerHTML +='<input type="button" disabled="disabled" id="legendDiv" style="size:5px;background-color:'+htmlColors[i]+';">'+nameList[i]+'</input><br>';
							// too many problems!!! hope to change colors to HEX format! 
							//Hope to match query. 
					}

                    var numFeatures = resultFeatures.length;
					var colorNum = 0; //We never use this variable...is there a plan for it or can we get rid of it?
                    for (var i = 0; i < numFeatures; i++) {
						//this loop will ensure that the same styles and types of theaters will always be paired with the same shapes and colors on the map
                        var graphic = resultFeatures[i];
						var style = resultFeatures[i].attributes.Style;
						var type = resultFeatures[i].attributes.Type;
					
						if (nameList.indexOf(style) <= -1) {
							style = 'Unknown';
						}
						if (typeList.indexOf(type) <= -1) {
							type = 'Unknown';
						}
							
					
						/*if (style=="" || style=="undefined"){
							continue;
						}*/
						
						var symbol = makeSymbol(colorDict[style], shapeDict[type]);	
						
                        graphic.setSymbol(symbol);
                        graphic.setInfoTemplate(infoTemplate);
                        map.graphics.add(graphic);
                    }
					
					//QueryLegendPane contains the tabs legendPane and queryPane
					var legendPane = dijit.byId("legendPane");
					var queryPane = dijit.byId("QueryPane");
					//var newButton = new dijit.form.Button({title:"backToLegend",content:"Back to Legend", type:"Button",onclick:"changeTab('legendPane')"});
				
					var queryLegendContainer = dijit.byId("QueryLegendPane");
					//legendPane.setAttribute('selected',true);
					//queryPane.setAttribute('selected',false);
					queryLegendContainer.selectChild(legendPane);
					
					for (key in symbol){ //I don't really understand what this does, but I don't think it works without it?
						symbol[key];
						
					}
                });
            }

            function changeTab(id){
				var selectedPane = dijit.byId(id);
				var queryLegendContainer = dijit.byId("QueryLegendPane");
				queryLegendContainer.selectChild(selectedPane);
			
			}

            function addSize(){
					
					var boo = document.getElementById("menu_Size").style;
					//alert(boo);
					if (boo.display == "none"){
						return "";
					}
					var minCavea = document.getElementById("mincavea").value;
					var maxCavea =  document.getElementById("maxcavea").value;
					var minSeating = document.getElementById("minseating").value;
					var maxSeating = document.getElementById("maxseating").value;
					var subquery = "";
					if (minCavea != ""){
						subquery +=" (Cavea_2>=" + minCavea + ") AND";
					}
					
					if (maxCavea !=""){
							subquery +=" (Cavea_2<=" + maxCavea + ") AND";
					}
					if (minSeating != ""){
							subquery +=" (Seating_2>=" + minSeating + ") AND";
					}
					
					if (maxSeating != ""){
							subquery +=" (Seating_2<=" + maxSeating + ") AND";
					}
					//alert(subquery);
					return subquery.slice(0,subquery.length-4);
			}

            
			/* handle the case when "all" is checked and disable other choices
			 Note: boxname should be the same as the "name" tag in each input tag 
			 we want to disable */
			 
            function clicked(boxname){
			
				var boxes = document.getElementsByName(boxname);
				if (dijit.byId(boxname).checked){
					
					for ( i in  boxes){	
						dijit.byId(boxes[i].id).setValue(false);
						dijit.byId(boxes[i].id).setAttribute('disabled',true);
					}
				
				}else{
					for ( i in  boxes){
						dijit.byId(boxes[i].id).setAttribute('disabled',false);
					}
				}
			}

            //onclick event handler for the "All Styles" checkbox
			function onlyNumbers(evt)
			{
				var e = event || evt; // for trans-browser compatibility
				var charCode = e.which || e.keyCode;

				if (charCode > 31 && (charCode < 48 || charCode > 57))
					return false;

				return true;

			}
		
