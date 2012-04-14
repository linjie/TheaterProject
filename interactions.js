
		dojo.require("dijit.layout.ContentPane");
		dojo.require("dijit.layout.TabContainer");
		dojo.require("dijit.layout.BorderContainer");
		dojo.require("dijit.layout.AccordionContainer");
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
	
	
		
		/*
			toggleMenu is the callback function related to the query menu shown on the right of the web page.
			This function is responsible for the changes of "+" and "-" when the user clicks on the "+" or "-".
			It displays or hides the corresponding query selection menu.
		*/
		function toggleMenu(menu, objID) {
			if (!document.getElementById) return;
				// the first line is supported by Firefox, Chrome, but not window.
				var ob = document.getElementById(objID).style;
				//
				ob.display = (ob.display == 'block')?'none': 'block';
				menu.innerHTML = (ob.display == 'block')? menu.innerHTML.replace("+","–") : menu.innerHTML.replace("–","+") ;
			}
		/*
			This is the callback function when the web page is loaded. 		
		
		*/
		function init(){
                // load the map

                map = new esri.Map("mapPane", {"logo":false});
				var legendLayers = [];
				
                var basemapURL = "https://arcgis.its.carleton.edu/ArcGIS/rest/services/ItalyTheaters/MapServer";
                var basemap = new esri.layers.ArcGISDynamicMapServiceLayer(basemapURL);
                map.addLayer(basemap);
	       
				//dojo.connect(map,'onLayersAddResult',initSlider);
			
              
				dojo.connect(map, "onLayerAddResult", initSlider);

				
			}
			
			function initSlider(results) {
				var map = this;
				//var timeSlider = new esri.dijit.TimeSlider({style: "width: 1000px;"},document.getElementById("timesliderPane"));
				var timeSlider = new esri.dijit.TimeSlider({style: "width: 90%;"},dojo.byId("timesliderDiv"));
				map.setTimeSlider(timeSlider);
				var timeExtent = new esri.TimeExtent();
				timeExtent.startTime = new Date(0,0,1);
				timeExtent.startTime.setFullYear('-500');
				timeExtent.endTime = dojo.date.add(timeExtent.startTime,"year", 1000);
				timeSlider.setThumbCount(2);
				// change unit later
				timeSlider.createTimeStopsByTimeInterval(timeExtent,10,'esriTimeUnitsYears');
				timeSlider.setThumbIndexes([0,1]);
				timeSlider.setThumbMovingRate(4000);
				timeSlider.startup();
				
				var labels = dojo.map(timeSlider.timeStops, function(timeStop,i){ 
				if(i%5 === 0){
					var year = timeStop.getUTCFullYear();
					if (year==-500){
						return "500BCE";
					}
					if  (year<0) {return -year}
					if  (year==500) {
						return "500CE";
					}
					if (year>=0) {return year}
				}
				else{
					return "";
				}
				});      
        
				timeSlider.setLabels(labels);
        
				dojo.connect(timeSlider, "onTimeExtentChange", function(timeExtent) {
				var startValString = timeExtent.startTime.getUTCFullYear(); //parse it later to display BC/AD
				
				var endValString = timeExtent.endTime.getUTCFullYear();
				var selected = ConstructQuery();
				if  (selected!=""){
					selected += " AND ";
				}
				selected += " (Year_Early <= "+ endValString+" AND Year_Late >="+ startValString +")";
				executeQuery(selected);
				});
			}
			
			
			
            function ConstructQuery(){
			var legend = document.getElementById("legendDiv");
					legend.innerHTML = "";
				var querySQL = "";
				var attributeList = ["styleAll", "typeAll", "locationAll"];
				var sqlNameList = ["Style", "Type", "Province"];
				var divNameList = ["Style", "Type", "Province"];
				var nameList = ['Greek', 'Roman', 'Unknown'];
				var htmlColors =["rgb(27,158,119)","rgb(217,95,2)","rgb(117,112,179)","rgb(0,255,0)","rgb(173,255,47)","rgb(160,32,240)","rgb(0,100,0)","rgb(255,20,147)"];
				for (var j=0; j<3; j++) {
					var boo = document.getElementById("menu_"+divNameList[j]).style;
					if (boo.display == "none"){
						continue;
					}
					var nodelist = document.getElementsByName(attributeList[j]);
					
					var tempQuery = "";			
					if (dijit.byId(attributeList[j]).checked) {	
						
						for (var i=0; i<nodelist.length; i++) {
							tempQuery += sqlNameList[j] + " = '" + nodelist[i].value+"' OR ";
							if (j==0){
							legend.innerHTML +='<input type="button" disabled="disabled" id="legendDiv" style="border-radius:10px; border: 1px solid #000;height: 12px; width: 12px;background-color:'+htmlColors[i]+';">&nbsp;'+nodelist[i].value+'</input><br>';
							}
						}
						tempQuery += sqlNameList[j] + " = ''";
						//tempQuery = tempQuery.slice(0, tempQuery.length-3);						
					}
					else {
						for (var i=0; i<nodelist.length; i++) {							
							if (dijit.byId(nodelist[i].id).checked) {		
								if (j==0){
									legend.innerHTML +='<input type="button" disabled="disabled" id="legendDiv" style="border-radius:12px; border: 1px solid #000;height: 12px; width: 12px;background-color:'+htmlColors[i]+';">&nbsp;'+nodelist[i].value+'</input><br>';
									tempQuery += sqlNameList[j] + " = '" + nodelist[i].value+"' OR ";
								}
							}
						}
						if (tempQuery!=""){
							tempQuery = tempQuery.slice(0, tempQuery.length-3);
						}
					}
					if (tempQuery!=""){
						querySQL += "(" + tempQuery + ") AND ";
					}	
				}
				var subquery = addSize();
				if (querySQL!=""){
					if (subquery ==""){
						querySQL = querySQL.slice(0, querySQL.length-4);
					}else{
						querySQL = querySQL + subquery;
					}
				}else{
					querySQL = subquery;
				}
				//alert(querySQL);

				return querySQL;			
			}
			
			function submitQuery() {
	
				executeQuery(ConstructQuery());
			}

			function makeSymbol(color, style) {
				var symbol = new esri.symbol.SimpleMarkerSymbol();
				if (style == 'CIRCLE'){
					symbol.style = esri.symbol.SimpleMarkerSymbol.STYLE_CIRCLE;
				}
				else if (style == 'DIAMOND'){
					symbol.style = esri.symbol.SimpleMarkerSymbol.STYLE_DIAMOND;
				}
				else if (style == 'X'){
					symbol.style = esri.symbol.SimpleMarkerSymbol.STYLE_X;
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
				
				query = new esri.tasks.Query();
                query.returnGeometry = true;
                query.outFields = ["Name","Style", "Type","Province","Town","Cavea_2","Seating_2", "Year_Early", "Year_Late"];
         
                
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
					
                    var infoTemplate = new esri.InfoTemplate("${Name}", "${*}");
                   //var legend = document.getElementById("legendDiv");
					//legend.innerHTML = "";
					var colors=[[27,158,119,0.75],[217,95,2,0.75],[117,112,179,0.75],[0,255,0,0.5],[173,255,47,0.5],[160,32,240,0.5],[0,100,0,0.5],[255,20,147,0.5]];
					var htmlColors =["rgb(27,158,119)","rgb(217,95,2)","rgb(117,112,179)","rgb(0,255,0)","rgb(173,255,47)","rgb(160,32,240)","rgb(0,100,0)","rgb(255,20,147)"];
					var shapes = ['CIRCLE', 'DIAMOND', 'SQUARE'];
					var colorList = {};
					var shapeList = {};
					var nameList = ['Greek', 'Roman', 'Unknown'];
					var typeList = ['Open-air', 'Roofed', 'Unknown'];
					for (var i=0; i<nameList.length; i++) {
							
						colorList[nameList[i]] = colors[i];
						//this changes the shapes with the color...how to seperate them?
						shapeList[typeList[i]] = shapes[i];
						
						//legend.innerHTML +='<input type="button" disabled="disabled" id="legendDiv" style="size:5px;background-color:'+htmlColors[i]+';">'+nameList[i]+'</input><br>';
							// too many problems!!! hope to change colors to HEX format! 
							//Hope to match query. 
					}
				
	
							
								
					
					
                    var numFeatures = resultFeatures.length;
					var colorNum = 0;
                    for (var i = 0; i < numFeatures; i++) {
                        var graphic = resultFeatures[i];
						var style = resultFeatures[i].attributes.Style;
						var type = resultFeatures[i].attributes.Type;
						
						//alert( type);
	                  
						if (nameList.indexOf(style) <= -1) {
							style = 'Unknown';
						}
						if (typeList.indexOf(type) <= -1) {
								type = 'Unknown';
							}
							
					
						
						
						/*if (style=="" || style=="undefined"){
							continue;
						}*/
						
						var symbol = makeSymbol(colorList[style], shapeList[type]);	
						
                        graphic.setSymbol(symbol);
                        graphic.setInfoTemplate(infoTemplate);
                        map.graphics.add(graphic);
                    }
					var legendPane = dijit.byId("legendPane");
					var queryPane = dijit.byId("QueryPane");
					//var newButton = new dijit.form.Button({title:"backToLegend",content:"Back to Legend", type:"Button",onclick:"changeTab('legendPane')"});
				
					var queryLegendContainer = dijit.byId("QueryLegendPane");
					//legendPane.setAttribute('selected',true);
					//queryPane.setAttribute('selected',false);
					queryLegendContainer.selectChild(legendPane);
					
					for (key in symbols){
						symbols[key];
						
					}
                });
            }

            function changeTab(id){
				var selectedPane = dijit.byId(id);
				var queryLegendContainer = dijit.byId("QueryLegendPane");
				queryLegendContainer.selectChild(selectedPane);
			
			}

            function addSize(){
					
					var boo = document.getElementById("menu4").style;
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
		
