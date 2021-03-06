var defaultLat = "37.491943159";
var defaultLng = "127.01311698";

$(function(){
	showMapInPosting();
	$("#posting_form").submit(function(e){

		var title = this.querySelector('#req_title');
		if(title.value.trim() == ''){
			alert("제목을 입력해주세요");
			e.preventDefault();
			return;
		}

		var content = this.querySelector('#content');
		if(content.value.trim() == ''){
			alert("내용을 입력해주세요");
			e.preventDefault();
			return;
		}

	});
});
function showMapInPosting(){
	$.getScript(   
		"//dapi.kakao.com/v2/maps/sdk.js?appkey=85097723654db6cd517aed007a5a1371&libraries=services&autoload=false"
		)
	.done(function(){

		function showMap(lat, lng){
			mapContainer = document.getElementById('map') // 지도를 표시할 div 
			mapOption = { 
				center: new daum.maps.LatLng(lat, lng), // 지도의 중심좌표
				level: 6// 지도의 확대 레벨
			}; 
			map = new daum.maps.Map(mapContainer, mapOption); 
			var markerPosition = new daum.maps.LatLng(lat, lng);
			var marker = new daum.maps.Marker({
				position:markerPosition
			});
			marker.setMap(map);
			var geocoder = new daum.maps.services.Geocoder();
			geocoder.coord2Address(lng, lat, function(result, status){
				if (status === daum.maps.services.Status.OK) {                         
					var curPosAddr = result[0].address.address_name;
					var addr = document.getElementById("addr");
					if(curPosAddr){
						addr.value = curPosAddr;
						$("#latitude").val(lat);
						$("#longitude").val(lng);
					}
				}
			});
			infowindow = new daum.maps.InfoWindow({zindex:1}); // 클릭한 위치에 대한 주소를 표시할 인포윈도우입니다
			// clickMap(marker, geocoder);


			daum.maps.event.addListener(map, 'click', function(mouseEvent) {
				console.log('mouseEvent.latLng.getLat() : ' + mouseEvent.latLng.getLat());
				var coords = mouseEvent.latLng;
				var clickPointLat = coords.getLat();
				var clickPointLng = coords.getLng();
				geocoder.coord2Address(clickPointLng, clickPointLat, function(result, status) {
					if (status === daum.maps.services.Status.OK) {
						var detailAddr = !!result[0].road_address ? '<div>도로명주소 : ' 
							+ result[0].road_address.address_name + '</div>' : '';
						detailAddr += '<div>지번 주소 : ' + result[0].address.address_name + '</div>';
						console.log(result[0]);
						var content = '<div class="bAddr">' +
										'<span class="title">법정동 주소정보</span>' + 
										detailAddr + 
									'</div>';

						marker.setPosition(mouseEvent.latLng);
						marker.setMap(map);

						// 인포윈도우에 클릭한 위치에 대한 법정동 상세 주소정보를 표시합니다
						infowindow.setContent(content);
						infowindow.open(map, marker);
									
						
						$("#latitude").val(clickPointLat);
						$("#longitude").val(clickPointLng);
						$("#addr").val(result[0].address.address_name);
						if(result[0].road_address){
							$("#road_addr").val(result[0].road_address.address_name);
						}else{
							$("#road_addr").val("");
						}
					}   
				});
			});
		}

		function showCurPosError(err){
			console.log(`navigatator.geolocation getCurrentPosition error message : ${err.message}`);
			showMap(defaultLat, defaultLng)
		}
		
		console.log('getscript kakao api - done, cb 실행');
		daum.maps.load(function(){  
			showCurPos();
			
		});
		function showCurPos(){
			console.log("showcurpos fnc 실행");
			var mapContainer;
			var map;
			var mapOption;
			
			if(navigator.geolocation){
				navigator.geolocation.getCurrentPosition(function(pos){
					console.log('nav geo 접근')
					console.log('pos : ' + JSON.stringify(pos));  //질문 빈객체로 나옴 아래는 출력됨
					lat = pos.coords.latitude;
					lng = pos.coords.longitude;
					console.log('lat : ' + lat + ', '  + 'lng : ' + lng);
					
					if( !(lat > 33 && lat < 38 && lng >125.9 && lng < 130) ){
						console.log("가져온 현재위치 좌표값 설정 범위 벗어남, 좌표 임의설정");
						lat = defaultLat;
						lng = defaultLng;
					}
					
					showMap(lat, lng)

				}, showCurPosError);
				

			}else{
				console.log('nav geo 접근 X')

				showMap(defaultLat, defaultLng)
			}
		}
	})
	.fail(function(){
		console.log('get map api script failed');
	});  
}

