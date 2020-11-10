var curLat;
var curLng;
var username = localStorage.getItem('username');
var userId = localStorage.getItem('userid');
var useremail = localStorage.getItem('useremail');
var userpic = localStorage.getItem('userpic');
var userOid = localStorage.getItem('useroid');

var s3Url = "https://tm-20201025.s3.ap-northeast-2.amazonaws.com";

$(function(){
    
    localStorage.setItem("s3Url", s3Url);

    var getUrl = "url('" + s3Url + "/upload/" + userpic + "') no-repeat center center"
    console.log("getUrl : " + getUrl);
    $("#sidebar_userpic").css("background", getUrl);
    $("#sidebar_userpic").css("background-size", "cover");
    $(".sidenav_layer .user_id").html(userId);
    $("#sidebar_email").html(useremail);

    $(".main_nav_item").on('click', function(e){
        console.dir(this)
        console.dir(e.target)  
        $(".main_nav_item").removeClass('active')
        this.classList.add('active')
    });
    $(".top_logo a").on('click', function(){
        location.href="/index.html"
    });
    $(".menu_icon").on("click", function(){
        $(".sidenav_layer").css("display", "block");
        $("body").css("overflow", "hidden")
        
    });
    $(".sidenav_close").click(function(){
        $(".sidenav_layer").css("display", "none");
        $("body").css("overflow", "auto")        
    }); 
    
    $("#filter_button").on("click", function(){
        $("#filter_layer").css("display", "block");
        $("body").css("overflow", "hidden");
    });
    $("#layer_close").click(function(){
        $("#filter_layer").css("display", "none");
        $("body").css("overflow", "visible");
    }); 

    if(navigator.geolocation){
        console.log('navi geo 접근 성공')
        navigator.geolocation.getCurrentPosition(function(pos){
            curLat = pos.coords.latitude;
            curLng = pos.coords.longitude;
            console.log('getCurPos 성공, lat : ' + curLat + ', lng : ' + curLng)
            console.log('accuracy : ' + pos.coords.accuracy);
        })
    }else{
        curLat = 37.4517447;        
        curLng = 126.6548974;
    }

    $("#map_search").click(function(){
        $.ajax({
            url:'/mapsearch'
            ,method:'get'
            ,success:function(data){
                if(data.length> 0){
                    showMapForSearch(data)
                }
                else{
                    var infoBox = "<div id='info_message_box'>"
                    infoBox +=  "<h2 style='margin:30px 0; text-align:center'>위치정보가 등록된 포스팅이 없습니다</h2>";
                    infoBox += "</div>";
                    document.getElementById('main_section').innerHTML = infoBox;
                }
                // $("#main_section").html(data);            
            }
            ,error:function(err){
                alert(err);
            }
        })
    })
    
    $("#nearby").click(function(){
        if(curLat&&curLng){
            getPostsNearby()
        }else if(navigator.geolocation){
            console.log('navi geo 접근 성공')
            navigator.geolocation.getCurrentPosition(function(pos){
                curLat = pos.coords.latitude;
                curLng = pos.coords.longitude;
                console.log('getCurPos 성공, lat : ' + curLat + ', lng : ' + curLng)
                console.log('accuracy : ' + pos.coords.accuracy);
            })
        }else{
            alert('현재 위치를 가져올 수 없습니다');
        }
    })
});

function showMapForSearch(geoData){
    $("#filterbox").css("display", "none")
    var mapSearchBox = "<div id='map_search_box'>"
        mapSearchBox +=   "<div id='map_for_search'>";
        mapSearchBox +=   "</div>";
        mapSearchBox +=   "<input type='button' id='map_search_button' class='bottom_button' value='검색'>";
        mapSearchBox += "</div>";
    document.getElementById('main_section').innerHTML = mapSearchBox;
    // var createEl = document.createElement("div")
    
    // createEl.setAttribute("id", "map_for_search");
    // $("#main_section").html(createEl)

    var mapContainer = document.getElementById("map_for_search"), // 지도를 표시할 div 
    mapOption = { 
        center: new daum.maps.LatLng(33.450701, 126.570667), // 지도의 중심좌표
        level: 5 // 지도의 확대 레벨
    };

    var map = new daum.maps.Map(mapContainer, mapOption); // 지도를 생성합니다
    
    var bounds = new daum.maps.LatLngBounds();    

    geoData.map((el)=>{
        var point = new daum.maps.LatLng(el.geometry.coordinates[1], el.geometry.coordinates[0])
        marker = new daum.maps.Marker({ position : point});
        marker.setMap(map);
        bounds.extend(point)
    })
    map.setBounds(bounds);  //?
    $("#map_search_button").click(()=>{
        var mapBounds = map.getBounds();
        var swLat = mapBounds.ka;
        var swLng = mapBounds.da;
        var neLat = mapBounds.ja;
        var neLng = mapBounds.ia;
        $.ajax({
            url:'/mapsearch'
            ,method:'post'
            ,data:{swCoords:[swLat, swLng], neCoords:[neLat, neLng]}
            ,success:function(data){
                $("#main_section").html(data);
            },error:function(err){
                alert(err);
            }
        })
    })
}

function getPostsNearby(){
    $.ajax({
        url:"/postlist/nearby"
        ,method:"post"
        ,data:{lat:curLat, lng:curLng}
        ,success:function(data){
            console.log('지도에서 검색 ajax success callback');
            $("#layer_close").trigger('click');
            $("#filterbox").css("display", "none")
            $("#main_section").html(data);
        }
        ,error:function(err){
            console.log('ajax /postfilter error : ');
            console.log(err);
        }
    });
}
