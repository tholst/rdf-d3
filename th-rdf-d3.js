// initializations
// test comment

"use strict;"
jQuery.noConflict();

// ##########################################
// class and function declaration/definitions
// ##########################################

function genericKey(d){
    return d.getKey();
}

function genericText(d){
    return d.getText();
}

function genericClass(d){
    return d.getClass();
}

var RdfNode = Class.create({
    initialize: function($super) {
        this.type = null;
        this.nodeId = (nodeId = nodeId + 1);
    },
    getKey: function() {
        return this.nodeId;
    },
    getClass: function() {
        return "node " + this.type;
    }   
});
    
var SourceNode = Class.create(RdfNode,{
    initialize: function($super) {
        $super();
        this.resourceLinks = [];
        this.blankLinks = [];
        this.literalLinks = [];
    },
    addLink: function(link) {
        if (link.target.type == "literal") { // literal target node
            this.literalLinks.push(link);    
        } else if (link.target.type == "resource") { // resource target node
            this.resourceLinks.push(link);
        } else { // blank target node
            this.blankLinks.push(link);
        }        
    },
    getAllLinks: function() {
        
    },
    getLiteralLinks: function(){return this.literalLinks;},
    getResourceLinks: function(){return this.resourceLinks;},
    getBlankLinks: function(){return this.blankLinks;}
});

var ResourceNode = Class.create(SourceNode,{
    initialize: function($super, uri) {
        $super();
        this.uri = uri;
        this.type = "resource";
    },
    getText: function(){
        return this.uri;
    }
});

var BlankNode = Class.create(SourceNode,{
    initialize: function($super, id) {
        $super();
        this.id = id;
        this.type = "blank";
    },
    getText: function(){
        return this.id;
    }
});

var LiteralNode = Class.create(RdfNode,{
    initialize: function($super,text) {
        $super();
        this.text = text;
        this.type = "literal";
        this.link = null;
    },
    addLink: function (link){
        this.link = link;    
    },
    getText: function(){
        return this.link.getText() + " -> " + this.text;
    }  
});

var Link = Class.create({
    initialize: function(sub,pred,obj) {
        this.source = sub;
        this.predicate = pred;
        this.target = obj;
    },
    getKey: function() {
        return this.source.nodeId + "," + this.predicate.predicateId + "," + this.target.nodeId;
    },
    getText: function(){
        return this.predicate.getText();
    },
    getClass: function(){
        return "link " + this.target.type;
    }
});

var Predicate = Class.create({
    initialize: function(uri){
        this.uri = uri;
        this.links = [];
        this.predicateId = (predicateId = predicateId + 1);
    },
    addLink: function(link) {
        this.links.push(link);
    },
    getText: function(){
        return this.uri;
    }
});

var LrnSet = Class.create({
    initialize: function(rdfXmlFilename, callbacks) {
        this.nodes = {};
        this.blankNodes = {};
        this.predicates = {};
        this.literals = [];
        this.links = [];
        this.rdfStore = {};
        this.callbacks = callbacks;
        var that = this;
        // ansync request for rdf data
        d3.xml(rdfXmlFilename, function(rdfXml) { //callback
            // parse rdf to LRN
            that.rdf2LRN(rdfXml);
            // call callback functions
            var i,j;
            for(i=0,j=that.callbacks.length; i<j; i++){
              that.callbacks[i](that);
            }
        });
    },
    getResourceNodes: function() {return this.nodes;},
    getBlankNodes: function() {return this.blankNodes;},
    getLiteralNodes: function() {return this.literals;},
    getSourceNodes: function() {
        return Object.values(this.nodes)
            .concat(Object.values(this.blankNodes));
    },
    getAllNodes: function() {
        return this.getSourceNodes().concat(this.literals);
    },
    getPredicates: function() {return this.predicates;},
    getAllLinks: function() {return this.links;},
    getLiteralLinks: function() {return this.links.filter(function (l,i){return l.target.type =="literal";});},
    getResourceLinks: function() {return this.links.filter(function (l,i){return l.target.type =="resource";});},
    getBlankLinks: function() {return this.links.filter(function (l,i){return l.target.type =="blank";});},
    getSourceLinks: function() {return this.getResourceLinks().concat(this.getBlankLinks());},    
    rdf2LRN: function (rdfXml) {
        var that = this;
        // load rdf/xml to rdf-store        
        this.rdfStore = jQuery.rdf().load(rdfXml);
        // get basic triples from store
        var triples = self.triples = this.rdfStore.where("?subject ?predicate ?object");
        // create nodes and links for each triple
        triples.each(function(){
            var s = this.subject.value._string;
            var p = this.predicate.value._string;
            var o = this.object.value.toString();
            
            // subject node
            var snode = {};
            if (this.subject.type == "uri") { // resource node
                snode = that.nodes[s] || (that.nodes[s] = new ResourceNode(s));
            } else { // blank node
                snode = that.blankNodes[s] || (that.blankNodes[s] = new BlankNode(s));
            }
            
            // predicate
            var pred = that.predicates[p] || (that.predicates[p] = new Predicate(p));
            
            // object node
            var onode = {};
            if (this.object.type == "literal") { // literal node
                that.literals.push(onode = new LiteralNode(o));
            } else if (this.object.type == "uri") { // resource node
                onode = that.nodes[o] || (that.nodes[o] = new ResourceNode(o));
            } else { // blank node
                onode = that.blankNodes[o] || (that.blankNodes[o] = new BlankNode(o));
            }
            
            // create and add link
            var link = new Link(snode,pred,onode);
            snode.addLink(link);
            pred.addLink(link);
            onode.addLink(link);
            that.links.push(link);
        });
    }
});

function setupDataLoaded(lrnSet){
    var headerSvg = self.headerSvg = d3.select("#viz")
        .append("svg")
        .attr("width", w)
        .attr("height",60)
        .attr("class","header");        
    
    headerSvg.append("g")
        .attr("transform", "translate("+ (w - 280)+ ", 50)")
        .append("g")
        .append("text")
        .transition()
        .delay(0)
        .duration(1000) 
        .attr("x",0)
        .attr("y",0)
        .text("Data loaded!")
        .attr("color","blue")
        .attr("font-size","55");
}

function setupLiteralPieGraph(lrnSet) {
    var graphSvg = d3.select("#viz")
    .append("svg")
    .attr("width", w)
    .attr("height",h)
    .attr("class","screen");   
    
    var force = d3.layout.force()
        .gravity(.05)
        .charge(-250)
        .theta(0.8)
        .friction(0.9)
        .linkStrength(1)
        .linkDistance(120)
        .nodes(lrnSet.getSourceNodes())
        .links(lrnSet.getSourceLinks())
        .size([w, h])
        .start();
    
    var r = 50,
    color = d3.scale.category20(),
    donut = self.donut = d3.layout.pie().value(function(d,i){return 1;}),
    arcIn = d3.svg.arc().innerRadius(2).outerRadius(radius-1);
    arcOut = d3.svg.arc().innerRadius(radius).outerRadius(r);
    
    var linkSelection = graphSvg.append("svg:g").selectAll("line.link.selection")
          .data(force.links(),genericKey)
        .enter().append("svg:line")
          .attr("class", "link selection")
          .attr("x1", function(d) { return d.source.x; })
          .attr("y1", function(d) { return d.source.y; })
          .attr("x2", function(d) { return d.target.x; })
          .attr("y2", function(d) { return d.target.y; })
          .on("mouseover",hover)
          .on("mouseout",unhover)
          .attr("original-title",genericText);
    
    var link = graphSvg.append("svg:g").selectAll("line.link")
          .data(force.links(),genericKey)
        .enter().append("svg:line")
          .attr("class", genericClass)
          .attr("x1", function(d) { return d.source.x; })
          .attr("y1", function(d) { return d.source.y; })
          .attr("x2", function(d) { return d.target.x; })
          .attr("y2", function(d) { return d.target.y; })
          .attr("marker-end",function(d){
              return "url(#"+d.target.type+"Arrow)";
            });

    var nodeG = graphSvg.append("g").selectAll("g")
        .data(force.nodes(),genericKey)
      .enter().append("svg:g")
        .attr("transform", function (d,i) {
            return "translate(" + d.x + "," + d.y + ")";   
        })
        .call(force.drag);
    
    var arcs = self.arcs = nodeG.selectAll("path")
        .data(function(d){ return donut(d.getLiteralLinks());})
      .enter().append("svg:path")
        .attr("class","literal")
        .attr("fill", function(d, i) { return color(i); })
        .attr("d",arcIn)
        .on("mouseover",hover)
        .on("mouseout",unhover)
        .attr("original-title",function(d,i){
            return "<ul><li> <em>Predicate</em>: <p>" 
                    + d.data.getText() 
                    + "</p></li><li> <em>Value</em>: <p>"
                    + d.data.target.text
                    + "</p></li></ul>";});
    
    var circles = nodeG.append("circle")
        .attr("class",genericClass)
        .attr("x",0)
        .attr("y",0)
        .attr("r", radius)
        .on("mouseover",hover)
        .on("mouseout",unhover)
        .on("click",triggerLiterals)
        .attr("original-title",genericText);
    
    // add tipsy tooltips
    jQuery("path.literal").tipsy({
        gravity: 'sw',
        hoverlock:true,
        fade: true,
        html: true,
        delayIn: 200});
    jQuery("circle").tipsy({fade: true});
    jQuery("line.link.selection").tipsy({fade: true});
    
    force.on("tick", function() {
                     
        link.attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });
        linkSelection.attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });
        
        nodeG.attr("transform", function (d,i) {
            return "translate(" + d.x + "," + d.y + ")";   
        });  
    
    });
    
    function triggerLiterals(d,i){
        var nextArc;
        
        if (d.expanded) {
            nextArc = arcIn;
            d.expanded = false;
        } else {
            nextArc = arcOut;
            d.expanded = true;
        }
        
        nodeG.data([d],genericKey)
            .selectAll("path")
            .transition()
            .ease("elastic")
            .delay(0)
            .duration(3000)
            .attr("d", nextArc);    
    }
}

function setupLRNGraph(lrnSet) {
    var force = d3.layout.force()
        .gravity(.05)
        .charge(-250)
        .theta(0.8)
        .friction(0.9)
        .linkStrength(1)
        .linkDistance(linkDist)
        .nodes(lrnSet.getAllNodes())
        .links(lrnSet.getAllLinks())
        .size([w, h])
        .start();
        
    function linkDist(link,index){
        if (link.target.type === "literal") {
            return 45; // distance for literal links
        } else {
            return 120; // distance for regular node links
        }            
    }    
        
    var dataSvg = self.dataSvg = d3.select("#viz")
        .append("svg")
        .attr("width", w)
        .attr("height",h)
        .attr("class","screen");
    
    var linkSelection = dataSvg.append("svg:g").selectAll("line.link.selection")
          .data(force.links(),genericKey)
        .enter().append("svg:line")
          .attr("class", "link selection")
          .attr("x1", function(d) { return d.source.x; })
          .attr("y1", function(d) { return d.source.y; })
          .attr("x2", function(d) { return d.target.x; })
          .attr("y2", function(d) { return d.target.y; })
          .on("mouseover",showText)
          .on("mouseout",hideText);
    
    var link = dataSvg.append("svg:g").selectAll("line.link")
          .data(force.links(),genericKey)
        .enter().append("svg:line")
          .attr("class", genericClass)
          .attr("x1", function(d) { return d.source.x; })
          .attr("y1", function(d) { return d.source.y; })
          .attr("x2", function(d) { return d.target.x; })
          .attr("y2", function(d) { return d.target.y; })
          .attr("marker-end",function(d){
              return "url(#"+d.target.type+"Arrow)";
            })
          /*.on("mouseover",showText)
          .on("mouseout",hideText)*/;
      
    var node = dataSvg.append("svg:g").selectAll("circle.node")
          .data(lrnSet.getSourceNodes(),genericKey)
        .enter().append("svg:circle")
          .attr("class", genericClass)
          .attr("cx", function(d) { return d.x; })
          .attr("cy", function(d) { return d.y; })
          .attr("r", radius)
          .on("mouseover",showText)
          .on("mouseout",hideText)
          .call(force.drag);
    
    var literalNode = dataSvg.append("svg:g").selectAll("rect.node.literal")
          .data(lrnSet.getLiteralNodes(),genericKey)
        .enter().append("svg:rect")
          .attr("class", genericClass)
          .attr("x", function(d) { return d.x - radius/2; })
          .attr("y", function(d) { return d.y - radius/2; })
          .attr("width", radius)
          .attr("height", radius)
          .on("mouseover",showText)
          .on("mouseout",hideText)
          .call(force.drag);
          
    var text = self.text = dataSvg.append("svg:g").selectAll("g")
        .data(force.nodes().concat(force.links()),genericKey)
      .enter().append("svg:g")
        .style("display", "none");    
    // A copy of the text with a thick white stroke for legibility.
    text.append("svg:text")
        .attr("x", 14)
        .attr("y", ".31em")
        .attr("class", "shadow")
        .text(genericText);    
    text.append("svg:text")
        .attr("x", 14)
        .attr("y", ".31em")
        .text(genericText);   
    
    force.on("tick", function() {         
        text.attr("transform", function(d) {
            if (d instanceof RdfNode) { //node
                return "translate(" + d.x + "," + d.y + ")";
            } else{ // link
                return "translate(" + (d.source.x + d.target.x)/2 + "," + (d.source.y + d.target.y)/2 + ")";
            }            
        });
                     
        link.attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });
        linkSelection.attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });
        
        node.attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; });
            
        literalNode.attr("x", function(d) { return d.x - radius/2; })
            .attr("y", function(d) { return d.y - radius/2; });
        }); 
        

}	

function setupCommonMarkers(lrnSet){
    var svg = d3.select("#viz")
        .append("svg");
    
    svg.append("marker")
        .attr("id", "resourceArrow")
        .attr("viewBox","0 0 20 20")
        .attr("markerUnits","userSpaceOnUse")
        .attr("markerWidth","20")
        .attr("markerHeight","20")
        .attr("refX","40")
        .attr("refY","10")
        .attr("orient","auto")
        .append("path")
        .attr("d","M0,5 L20,10 L0,15 L5,10");
        
    svg.append("marker")
        .attr("id", "literalArrow")
        .attr("viewBox","0 0 20 20")
        .attr("markerUnits","userSpaceOnUse")
        .attr("markerWidth","20")
        .attr("markerHeight","20")
        .attr("refX","25")
        .attr("refY","10")
        .attr("orient","auto")
        .append("path")
        .attr("d","M0,5 L20,10 L0,15 L5,10");

    svg.append("marker")
        .attr("id", "blankArrow")
        .attr("viewBox","0 0 20 20")
        .attr("markerUnits","userSpaceOnUse")
        .attr("markerWidth","20")
        .attr("markerHeight","20")
        .attr("refX","40")
        .attr("refY","10")
        .attr("orient","auto")
        .append("path")
        .attr("d","M0,5 L20,10 L0,15 L5,10"); 
}

function hover(d,i){
    d.currentClass = d3.select(this).attr("class");
    d3.select(this).attr("class", d.currentClass + " hover");      
}

function unhover(d,i){
    d3.select(this).attr("class", d.currentClass);
}  
	
function showText(d,i){
    d.currentClass = d3.select(this).attr("class");
    d3.select(this).attr("class", d.currentClass + " hover");  
      
    text.data([d.data || d],genericKey)
       .style("display", "block");    
}

function hideText(d,i){
    d3.select(this).attr("class", d.currentClass);
       
    text.data([d.data || d],genericKey)
        .style("display", "none");    
}   

function fDiv(n1, n2) {
  // Simulation einer ganzahligen Division 
  return ( n1 - (n1 % n2) ) / n2;
}


// ############## END #######################
// class and function declaration/definitions
// ############## END #######################



// initialize ids, set constants
var nodeId = 0,
    predicateId = 0,
    radius = 20,
    w = 1000,
    h = 600;

var callbacks = [setupDataLoaded,setupLiteralPieGraph,setupCommonMarkers];
    
// 1. create LRN dataset (XML -> rdfStore -> LRN)
//  - load xml file
//  - load rdf to store 
//  - parse triples to LRN
// 2. call Callback functions
var lrn = new LrnSet("min.rdf",callbacks);



