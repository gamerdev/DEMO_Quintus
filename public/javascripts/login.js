$(function() {
    $(".btn-submit")
        .click(function() {
            var team = $(this).data("team");
            $("#inpTeam").value(team);
            $("#form").submit();
        });
})