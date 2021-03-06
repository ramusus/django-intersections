$.ajaxPrefilter(function( options ) {
    options.async = false;
});



var intervalID;
var groups;


$("#group_form").submit(function(e){
    e.preventDefault();

    if (intervalID)
        clearInterval(intervalID)

    links = $(this).find('#id_links').val();
    links_arr = links.trim().split(/\s+/);

    $subscribers_table = $('#subscribers_table').find('tbody');
    $subscribers_table.html('');

    $intersections_tbody = $('#intersections_table tbody');
    $intersections_tbody.html('');
    $intersections_thead = $('#intersections_table thead');
    $intersections_thead.html('<tr><th>ПЕРЕСЕЧЕНИЕ</th><th></th></tr><tr><th></th><th></th></tr>');
    $intersections_thead.hide();

    groups = [];
    var i = 0;

    $status = $(this).find('#status').html('');

    if (!check_links(links_arr)) {
        $status.html('Ссылки не принадлежат одной соц.сети')
        $('#subscribers_table').hide();
        return false
    }

    $('#subscribers_table').show();
    iterate(i);
});


function check_links(links_arr) {
    var prev_social;

    for (i in links_arr) {
        var link = links_arr[i];
        var arr = link.split('/');
        if (arr.length < 3)  // wrong url
            continue

        social = arr[2];
        if (prev_social && prev_social != social)
            return false
        else
            prev_social = social
    }

    return true
}





function iterate(i) {
    link = links_arr[i];

    i++;
    if (i > links_arr.length)
        return

    $.post(FETCH_GROUP_URL, {'link': link}, function(response) {
        if (response['errors']) {
            $row = $('<tr>');
            $cell1 = $('<td>').html(link).appendTo($row);
            $cell2 = $('<td class="error" colspan=3>').html(response['errors']).appendTo($row);
            $subscribers_table.append($row);
            iterate(i); // iterate next link
            return
        }

        social = response['social'];
        group = response['group'];

        var members_in_db_count = group['members_in_db_count'];
        if (!group['members_fetched_date']) {
            members_in_db_count += '<i class="progress"> ...</i>';
        }

        cells_arr = [
            '<a href="%s">%s</a>'.replace(/%s/g, link),
            group['name'],
            members_in_db_count,
            group['members_count'],
        ]

        cells_arr = $.map(cells_arr, function(el) {
           return $('<td>').html(el);
        });
        $row = $('<tr>').html(cells_arr);
        $subscribers_table.append($row);

        if (!group['members_fetched_date']) {
            fetch_members(social, group['id'], i);
        }
        else {
            groups.push(group);
            generate_intersections_table(social);
            iterate(i); // iterate next link
        }
    });

}



function fetch_members(social, group_id, i) {
    url = FETCH_GROUP_MEMBERS_MONITOR_URL + social + '/' + group_id + '/'
    $cell = $subscribers_table.find('tr:last td:nth-child(3)');

    var error;
    var group;

    settings = {
        'url': url,
        'async': false,
        'success': function(response) {
            error = null;
            group = null;

            if (response['errors']) {
                error = '<i class="error">' + response['errors'] + '</i>';
                $cell.html(error);
                return
            }

            group = response['group'];

            var members_in_db_count = group['members_in_db_count'];
            if (!group['members_fetched_date']) {
                members_in_db_count += '<i class="progress"> ...</i>';
            }

            $cell.html(members_in_db_count);
        }
    }

    update_members = function(){
        $.get(settings);
        if(error) {
            clearInterval(intervalID);
            iterate(i); // iterate next link
        }
        else if (group['members_fetched_date']) {
            clearInterval(intervalID);
            groups.push(group);
            generate_intersections_table(social);
            iterate(i); // iterate next link
        }
    }
    intervalID = setInterval(update_members, 5000);
    update_members(); // first start without delay
}


function generate_intersections_table(social) {
    $intersections_thead.show();
    group = groups[groups.length-1] // last group

    // thead
    $row1 = $intersections_thead.find('tr:first');
    $row2 = $intersections_thead.find('tr:last');

    $cell1 = $('<th>').html(group['screen_name'])
    $cell2 = $('<td>').html(group['members_in_db_count'])
    $cell1.appendTo($row1);
    $cell2.appendTo($row2);

    // tbody
    $row = $('<tr>').appendTo($intersections_tbody); // last row
    $cell1 = $('<th>').html(group['screen_name'])
    $cell2 = $('<td>').html(group['members_in_db_count'])
    $cell1.appendTo($row);
    $cell2.appendTo($row);

    // intersections
    for(var i = 0; i < groups.length - 1; i++) {
        var group1 = groups[i];

        url = GET_INTERSECTIONS_URL + social + '/' + group1['id'] + '/' + group['id'] + '/';
        $.get(url, function(response) {
            $cell = $('<th>').html(response['intersections_count'])
            $cell.appendTo($row);
        });
    }

    // add_epty_cells_to_rows
    var cells_count = $intersections_thead.find('tr:first th').length;

    $intersections_tbody.find('tr').each(function(index){
        var cells_in_row = $(this).find('th').length;

        for(cells_in_row; cells_in_row < cells_count - 1; cells_in_row++) {
            $('<th>').appendTo($(this));
        }
    });
}
