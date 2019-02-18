$(function(){
    var labels = $('#filter_form label');
    labels.click(function(e){
        var tgClass = this.className    
        var lbls = document.querySelectorAll('label.'+tgClass);
        lbls.forEach(function(lbl){
            lbl.classList.remove('active')
        })
        this.classList.add('active')
    })

    $("#filter_submit").click(function(){
        $.ajax({
            url:"/postlist/filter"
            ,method:"post"
            ,data:$("#filter_form").serializeArray()
            ,success:function(data){
                console.log('filter_submit ajax success callback');
                $("#layer_close").trigger('click');
                $("#main_section").html(data);
                
                // var showData = "";
                // $("#main_section").html(showData);
            }
            ,error:function(err){
                console.log('ajax /postfilter error : ');
                console.log(err);
            }
        });
    });
})