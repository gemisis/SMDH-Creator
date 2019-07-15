/*
SMDH Creator v1.1 by Marc Robledo 2015
based on SMDH Creator by GEMISIS https://github.com/gemisis/SMDH-Creator
more info about SMDH format: http://3dbrew.org/wiki/SMDH
I didn't change anything to do this all credit above
*/
function el(e){return document.getElementById(e)}
function show(e){el(e).style.display='block'}
function hide(e){el(e).style.display='none'}
function addEvent(e,ev,f){if(e.addEventListener){e.addEventListener(ev,f,false);return true}else if(e.attachEvent)e.attachEvent('on'+ev,f)}


const TILE_ORDER=[0,1,8,9,2,3,10,11,16,17,24,25,18,19,26,27,4,5,12,13,6,7,14,15,20,21,28,29,22,23,30,31,32,33,40,41,34,35,42,43,48,49,56,57,50,51,58,59,36,37,44,45,38,39,46,47,52,53,60,61,54,55,62,63];
const VALID_LANGUAGES=[2,3,4,5];
const SMDH_SIZE=14016;
const SMDH_MAGIC=0x48444d53;

//var LANGUAGES=[jp,en,fr,de,it,es,ch_simplified,ko,du,po,ru,ch_traditional];

var smdh, tempImage, tempImageReader, tempFile, tempFileLoadFunction;


function UnicodeString(maxLength){
	this.maxLength=maxLength;
	this.array=new Array(maxLength);
	this.reset()
}
UnicodeString.prototype.getString=function(){
	var str='';
	for(var i=0; i<this.array.length && this.array[i]!=0x0000; i++)
		str+=String.fromCharCode(this.array[i]);

	return str
}
UnicodeString.prototype.reset=function(){
	for(var i=0;i<this.maxLength; i++)
		this.array[i]=0x0000
}
UnicodeString.prototype.set=function(s){
	this.reset();
	for(var i=0;i<this.maxLength && i<s.length; i++)
		this.array[i]=s.charCodeAt(i)
}
UnicodeString.prototype.setChar=function(p,c){
	this.array[p]=c
}





function SMDHHeader(){
	this.magic=SMDH_MAGIC; //u32
	this.version=0, this.reserved=0; //u16
}
function SMDHTitle(){
	this.shortDescription=new UnicodeString(0x40);
	this.longDescription=new UnicodeString(0x80);
	this.publisher=new UnicodeString(0x40)
}
function SMDHSettings(){
	this.gameRatings=new Array(0x10); //u8
	this.regionLock=0; //u32
	this.matchMakerId=new Array(0x0c); //u8
	this.flags=0; //u32
	this.eulaVersion=0, this.reserved=0; //u16
	this.defaultFrame=0, this.cecId=0; //u32
}	
function SMDH(){
	this.file=new MarcFile(SMDH_SIZE);
	this.file.fileName='icon.smdh';
	this.file.seqMode=true;
	this.file.littleEndian=true;
	this.file.seekOffset=0;

	this.header=new SMDHHeader();
	this.applicationTitles=new Array(16); for(var i=0; i<16; i++)this.applicationTitles[i]=new SMDHTitle();
	this.settings=new SMDHSettings();
	this.reserved=new Array(0x08);

	this.bigIconData=new Array(0x0900); for(var i=0; i<0x0900; i++)this.bigIconData[i]=0;
	this.smallIconData=new Array(0x0240); for(var i=0; i<0x0240; i++)this.smallIconData[i]=0;



	var smallIcon=el('small-icon');
	smallIcon.width=24;
	smallIcon.height=24;

	var bigIcon=el('big-icon');
	bigIcon.width=48;
	bigIcon.height=48;
}
SMDH.prototype.isValid=function(){
	return this.header.magic==SMDH_MAGIC
}
SMDH.prototype.readTitle=function(titleId){
	this.applicationTitles[titleId]=new SMDHTitle();
	for (var i=0; i<0x40; i++)
		this.applicationTitles[titleId].shortDescription.setChar(i, this.file.readU16());

	for (var i=0; i<0x80; i++)
		this.applicationTitles[titleId].longDescription.setChar(i, this.file.readU16());

	for (var i=0; i<0x40; i++)
		this.applicationTitles[titleId].publisher.setChar(i, this.file.readU16());
}





SMDH.prototype.load=function(){
	tempFile.seqMode=true;
	tempFile.littleEndian=true;
	tempFile.seekOffset=0;

	/* read header */
	this.header.magic=tempFile.readU32();

	if(this.isValid() && this.file.fileSize==SMDH_SIZE){
		this.file=tempFile;

		this.header.version=this.file.readU16();
		this.header.reserved=this.file.readU16();

		/* read titles */
		for(var i=0; i<this.applicationTitles.length; i++)
			this.readTitle(i);

		/* read settings */
		for(var i=0; i<0x10; i++)
			this.settings.gameRatings[i]=this.file.read();
		this.settings.regionLock=this.file.readU32();
		for(var i=0; i<0x0c; i++)
			this.settings.matchMakerId[i]=this.file.read();
		this.settings.flags=this.file.readU32();
		this.settings.eulaVersion=this.file.readU16();
		this.settings.reserved=this.file.readU16();
		this.settings.defaultFrame=this.file.readU32();
		this.settings.cecId=this.file.readU32();

		/* read reserved */
		for(var i=0; i<0x8; i++)
			this.reserved[i]=this.file.read();
	
		/* read small icon */
		for(var i=0; i<this.smallIconData.length; i++)
			this.smallIconData[i]=this.file.readU16();
		this.convertIconToBitmap(false);

		/* read big icon */
		for(var i=0; i<this.bigIconData.length; i++)
			this.bigIconData[i]=this.file.readU16();
		this.convertIconToBitmap(true);

		var globalShortDescription=this.applicationTitles[1].shortDescription.getString();
		var globalLongDescription=this.applicationTitles[1].longDescription.getString();
		var globalPublisher=this.applicationTitles[1].publisher.getString();

		el('short-description').value=globalShortDescription;
		el('long-description').value=globalLongDescription;
		el('publisher').value=globalPublisher;

		for(var i=0; i<VALID_LANGUAGES.length; i++){
			var lang=VALID_LANGUAGES[i];

			var shortDescription=this.applicationTitles[lang].shortDescription.getString();
			if(shortDescription!=globalShortDescription)
				el('short-description'+lang).value=shortDescription;

			var longDescription=this.applicationTitles[lang].longDescription.getString();
			if(longDescription!=globalLongDescription)
				el('long-description'+lang).value=longDescription;

			var publisher=this.applicationTitles[lang].publisher.getString();
			if(publisher!=globalPublisher)
				el('publisher'+lang).value=publisher;
		}

		
	}else{
		alert('Invalid SMDH file.');
	}
}
SMDH.prototype.save=function(){
	this.header.magic=SMDH_MAGIC;

	this.file.seekOffset=0;
	this.file.writeU32(this.header.magic);
	this.file.writeU16(this.header.version);
	this.file.writeU16(this.header.reserved);


	var globalShortDescription=el('short-description').value;
	var globalLongDescription=el('long-description').value;
	var globalPublisher=el('publisher').value;

	for(var i=0; i<this.applicationTitles.length; i++){
		var shortDescription=globalShortDescription;
		var longDescription=globalLongDescription;
		var publisher=globalPublisher;

		if(el('row-short-description'+i)){
			if(el('short-description'+i).value !== '')
				shortDescription=el('short-description'+i).value;

			if(el('long-description'+i).value !== '')
				longDescription=el('long-description'+i).value;

			if(el('publisher'+i).value !== '')
				publisher=el('publisher'+i).value;
		}

		this.applicationTitles[i].shortDescription.set(shortDescription);
		this.applicationTitles[i].longDescription.set(longDescription);
		this.applicationTitles[i].publisher.set(publisher);



		for(var j=0; j<this.applicationTitles[i].shortDescription.maxLength; j++)
			this.file.writeU16(this.applicationTitles[i].shortDescription.array[j]);

		for(var j=0; j<this.applicationTitles[i].longDescription.maxLength; j++)
			this.file.writeU16(this.applicationTitles[i].longDescription.array[j]);

		for(var j=0; j<this.applicationTitles[i].publisher.maxLength; j++)
			this.file.writeU16(this.applicationTitles[i].publisher.array[j]);
	}

	for(var i=0; i<this.settings.gameRatings.length; i++)
		this.file.write(this.settings.gameRatings[i]);
	this.file.writeU32(this.settings.regionLock);
	for(var i=0; i<this.settings.matchMakerId.length; i++)
		this.file.write(this.settings.matchMakerId[i]);
	this.file.writeU32(this.settings.flags);
	this.file.writeU16(this.settings.eulaVersion);
	this.file.writeU16(this.settings.reserved);
	this.file.writeU32(this.settings.defaultFrame);
	this.file.writeU32(this.settings.cecId);

	for(var i=0; i<this.reserved.length; i++)
		this.file.write(this.reserved[i]);

	for(var i=0; i<this.smallIconData.length; i++)
		this.file.writeU16(this.smallIconData[i]);

	for(var i=0; i<this.bigIconData.length; i++)
		this.file.writeU16(this.bigIconData[i]);


	this.file.save()
}


SMDH.prototype.convertIcon=function(bigIcon, toBitmap){
	var iconSize, iconData, canvasCtx;
	if(bigIcon){
		iconSize=48;
		iconData=this.bigIconData;
		canvasCtx=el('big-icon').getContext('2d');
	}else{
		iconSize=24;
		iconData=this.smallIconData;
		canvasCtx=el('small-icon').getContext('2d');
	}

	if(toBitmap){
		var i=0;
		for(var tile_y=0; tile_y<iconSize; tile_y+=8){
			for(var tile_x=0; tile_x<iconSize; tile_x+=8){
				for(var k=0; k<8*8; k++){
					var x=TILE_ORDER[k] & 0x7;
					var y=TILE_ORDER[k] >> 3;
					var color=iconData[i];
					i++;

					var b=(color & 0x1f) << 3;
					var g=((color >> 5) & 0x3f) << 2;
					var r=((color >> 11) & 0x1f) << 3;

					canvasCtx.fillStyle='rgb('+r+','+g+','+b+')';
					canvasCtx.fillRect(x + tile_x, y + tile_y, 1, 1);
				}
			}
		}
	}else{
		var i=0;
		for(var tile_y=0; tile_y<iconSize; tile_y+=8){
			for(var tile_x=0; tile_x<iconSize; tile_x+=8){
				for(var k=0; k<8*8; k++){
					var x=TILE_ORDER[k] & 0x7;
					var y=TILE_ORDER[k] >> 3;

					var pixelData=canvasCtx.getImageData(x + tile_x, y + tile_y, 1, 1);
					var r=pixelData.data[0] >> 3;
					var g=pixelData.data[1] >> 2;
					var b=pixelData.data[2] >> 3;
					
					iconData[i]=((r << 11) | (g << 5) | b);
					i++;
				}
			}
		}
	}
}
SMDH.prototype.convertIconToBitmap=function(bigIcon){this.convertIcon(bigIcon,true)}



function importBigCanvas(){tempImageReader.readAsDataURL(el('file-load').files[0])}
function importSmallCanvas(){tempImageReader.readAsDataURL(el('file-load').files[0])}
function loadSMDHFromFile(){smdh.load()}
function loadSMDH(){tempFile=new MarcFile(el('file-load').files[0], loadSMDHFromFile)}

function clickImportBigCanvas(){tempFileLoadFunction=importBigCanvas;el('file-load').click()}
function clickImportSmallCanvas(){tempFileLoadFunction=importSmallCanvas;el('file-load').click()}
function clickLoadSMDH(){tempFileLoadFunction=loadSMDH;el('file-load').click()}
function clickSaveSMDH(){smdh.save()}





/* Initialize SMDH Creator */
addEvent(window,'load',function(){
	smdh=new SMDH();

	tempImage=document.createElement('img');
	addEvent(tempImage, 'load', function(){
		if(el('both-icons').checked){
			el('big-icon').getContext('2d').drawImage(tempImage,0,0,48,48);
			el('small-icon').getContext('2d').drawImage(tempImage,0,0,24,24);
			smdh.convertIcon(true, false);
			smdh.convertIcon(false, false);
		}else if(tempFileLoadFunction==importBigCanvas){
			el('big-icon').getContext('2d').drawImage(tempImage,0,0,48,48);
			smdh.convertIcon(true, false);
		}else if(tempFileLoadFunction==importSmallCanvas){
			el('small-icon').getContext('2d').drawImage(tempImage,0,0,24,24);
			smdh.convertIcon(false, false);
		}
	});

	tempImageReader=new FileReader();
	addEvent(tempImageReader, 'load', function(){
		//if(validFileType)
		tempImage.src=tempImageReader.result;
	});

	for(var i=0; i<VALID_LANGUAGES.length; i++)
		createLangElements(VALID_LANGUAGES[i]);

	el('default-lang').checked=true
});

function changeLang(lang){	
	if(lang==null){
		showLangRows('');
		hide('lang-info');
	}else{
		hideLangRows('');
		show('lang-info');
	}
	for(var i=0; i<VALID_LANGUAGES.length; i++)
		if(lang==VALID_LANGUAGES[i])
			showLangRows(lang);
		else
			hideLangRows(VALID_LANGUAGES[i]);

}
function showLangRows(lang){
	show('row-short-description'+lang);
	show('row-long-description'+lang);
	show('row-publisher'+lang)
}
function hideLangRows(lang){
	hide('row-short-description'+lang);
	hide('row-long-description'+lang);
	hide('row-publisher'+lang)
}
function createLangElements(lang){
	var label=document.createElement('label');
	var input=document.createElement('input');
	input.type='radio';
	input.name='lang';
	addEvent(input, 'click', function(){changeLang(lang)});

	var span=document.createElement('span');
	span.className='flag flag'+lang;

	label.appendChild(input);
	label.appendChild(span);

	el('lang-selector').appendChild(label);


	el('langs').appendChild(createLangRow('short-description'+lang, 'Short description', 64));
	el('langs').appendChild(createLangRow('long-description'+lang, 'Long description', 128));
	el('langs').appendChild(createLangRow('publisher'+lang, 'Publisher', 64));
}

function createLangRow(id, labelText,maxLength){
	var row=document.createElement('div');
	row.className='row';
	row.id='row-'+id;
	row.style.display='none';

	var label=document.createElement('label');
	label.className='label';
	label.htmlFor=id;
	label.innerHTML=labelText+':';

	var input=document.createElement('input');
	input.text='text';
	input.className='input';
	input.id=id;
	input.maxLength=maxLength;

	row.appendChild(label);
	row.appendChild(input);

	return row
}


/* MarcFile.js 20150922 by Marc */
function MarcFile(source, func){
	if(typeof window.FileReader !== 'function'){
		alert('Your browser doesn\'t support FileReader.');
		return null
	}
	
	if(typeof source === 'object' && source.name && source.size /*&& source.type*/){
		this.file=source;
		this.fileName=this.file.name;
		this.fileSize=this.file.size;
		this.fileType=source.type;

		this.fileReader=new FileReader();
		this.fileReader.addEventListener('load', function(){this.dataView=new DataView(this.result)}, false);
		if(func)
			this.fileReader.addEventListener('load', func, false);
		this.fileReader.readAsArrayBuffer(this.file);


	}else if(typeof source === 'number'){
		this.fileSize=source;
		this.fileName='filename.bin';
		this.fileType='application/octet-stream';

		this.fileReader=new ArrayBuffer(this.fileSize);
		this.fileReader.dataView=new DataView(this.fileReader);

		if(func)
			func.call;
	}else{
		alert('Invalid type of file.');
		return null
	}

	this.seekOffset=0;
	this.seqMode=false;
	this.littleEndian=false;
}
MarcFile.prototype.read=function(p){
	if(p===undefined)p=0;
	var ret=this.fileReader.dataView.getUint8(this.seekOffset+p);
	if(this.seqMode)this.seekOffset++;
	return ret
}
MarcFile.prototype.readU16=function(p){
	if(p===undefined)p=0;
	var ret=this.fileReader.dataView.getUint16(this.seekOffset+p,this.littleEndian);
	if(this.seqMode)this.seekOffset+=2;
	return ret
}
MarcFile.prototype.readU32=function(p){
	if(p===undefined)p=0;
	var ret=this.fileReader.dataView.getUint32(this.seekOffset+p,this.littleEndian);
	if(this.seqMode)this.seekOffset+=4;
	return ret
}
MarcFile.prototype.readArray=function(p,l){
	var bytes=new Array(nBytes);for(var i=0;i<l;i++)bytes[i]=this.read(p+i);return bytes
}
MarcFile.prototype.write=function(v){
	this.fileReader.dataView.setUint8(this.seekOffset+0,v);
	if(this.seqMode)this.seekOffset++
}
MarcFile.prototype.writeU16=function(v){
	this.fileReader.dataView.setUint16(this.seekOffset+0,v,this.littleEndian);
	if(this.seqMode)this.seekOffset+=2
}
MarcFile.prototype.writeU32=function(v){
	this.fileReader.dataView.setUint32(this.seekOffset+0,v,this.littleEndian);
	if(this.seqMode)this.seekOffset+=4
}	
MarcFile.prototype.save=function(){
	var blob;
	try{
		blob=new Blob([this.fileReader.dataView],{type:this.fileType});
	}catch(e){
		//old browser, using BlobBuilder
		window.BlobBuilder=window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder || window.MSBlobBuilder;
		if(e.name == 'TypeError' && window.BlobBuilder){
			var bb=new BlobBuilder();
			bb.append(this.fileReader.dataView.buffer);
			blob=bb.getBlob(this.fileType);
		}else if(e.name=='InvalidStateError'){
			blob=new Blob([this.fileReader.dataView.buffer],{type:this.fileType});
		}else{
			alert('Incompatible browser.');
		}
	}

	saveAs(blob, this.fileName)
}

/*! @source http://purl.eligrey.com/github/FileSaver.js/blob/master/FileSaver.js */
var saveAs=saveAs||function(e){"use strict";if("undefined"==typeof navigator||!/MSIE [1-9]\./.test(navigator.userAgent)){var t=e.document,n=function(){return e.URL||e.webkitURL||e},o=t.createElementNS("http://www.w3.org/1999/xhtml","a"),r="download"in o,i=function(e){var t=new MouseEvent("click");e.dispatchEvent(t)},a=e.webkitRequestFileSystem,c=e.requestFileSystem||a||e.mozRequestFileSystem,u=function(t){(e.setImmediate||e.setTimeout)(function(){throw t},0)},f="application/octet-stream",s=0,d=500,l=function(t){var o=function(){"string"==typeof t?n().revokeObjectURL(t):t.remove()};e.chrome?o():setTimeout(o,d)},v=function(e,t,n){t=[].concat(t);for(var o=t.length;o--;){var r=e["on"+t[o]];if("function"==typeof r)try{r.call(e,n||e)}catch(i){u(i)}}},p=function(e){return/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(e.type)?new Blob(["﻿",e],{type:e.type}):e},w=function(t,u,d){d||(t=p(t));var w,y,m,S=this,h=t.type,O=!1,R=function(){v(S,"writestart progress write writeend".split(" "))},b=function(){if((O||!w)&&(w=n().createObjectURL(t)),y)y.location.href=w;else{var o=e.open(w,"_blank");void 0==o&&"undefined"!=typeof safari&&(e.location.href=w)}S.readyState=S.DONE,R(),l(w)},g=function(e){return function(){return S.readyState!==S.DONE?e.apply(this,arguments):void 0}},E={create:!0,exclusive:!1};return S.readyState=S.INIT,u||(u="download"),r?(w=n().createObjectURL(t),o.href=w,o.download=u,void setTimeout(function(){i(o),R(),l(w),S.readyState=S.DONE})):(e.chrome&&h&&h!==f&&(m=t.slice||t.webkitSlice,t=m.call(t,0,t.size,f),O=!0),a&&"download"!==u&&(u+=".download"),(h===f||a)&&(y=e),c?(s+=t.size,void c(e.TEMPORARY,s,g(function(e){e.root.getDirectory("saved",E,g(function(e){var n=function(){e.getFile(u,E,g(function(e){e.createWriter(g(function(n){n.onwriteend=function(t){y.location.href=e.toURL(),S.readyState=S.DONE,v(S,"writeend",t),l(e)},n.onerror=function(){var e=n.error;e.code!==e.ABORT_ERR&&b()},"writestart progress write abort".split(" ").forEach(function(e){n["on"+e]=S["on"+e]}),n.write(t),S.abort=function(){n.abort(),S.readyState=S.DONE},S.readyState=S.WRITING}),b)}),b)};e.getFile(u,{create:!1},g(function(e){e.remove(),n()}),g(function(e){e.code===e.NOT_FOUND_ERR?n():b()}))}),b)}),b)):void b())},y=w.prototype,m=function(e,t,n){return new w(e,t,n)};return"undefined"!=typeof navigator&&navigator.msSaveOrOpenBlob?function(e,t,n){return n||(e=p(e)),navigator.msSaveOrOpenBlob(e,t||"download")}:(y.abort=function(){var e=this;e.readyState=e.DONE,v(e,"abort")},y.readyState=y.INIT=0,y.WRITING=1,y.DONE=2,y.error=y.onwritestart=y.onprogress=y.onwrite=y.onabort=y.onerror=y.onwriteend=null,m)}}("undefined"!=typeof self&&self||"undefined"!=typeof window&&window||this.content);"undefined"!=typeof module&&module.exports?module.exports.saveAs=saveAs:"undefined"!=typeof define&&null!==define&&null!=define.amd&&define([],function(){return saveAs});