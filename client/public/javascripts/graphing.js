  let server = 'http://ts-server-lb-1418829415.ap-southeast-2.elb.amazonaws.com:3001/stats?tags='
  if (tracking !== 'none') {
    console.log("We have tags")
    console.log(tracking);
    google.charts.load('current', {
      callback: function () {
        var chart = new google.visualization.LineChart(document.getElementById('chart'));
        var options = {'title' : 'Average Sentiment over time!',
          animation: {
            duration: 2000,
            easing: 'out',
            startup: true
          },
          hAxis: {
            title: 'Time'
          },
          vAxis: {
            title: 'Sentiment',
            //minValue: -1,
            //maxValue: 1
          },
          height: 400,
          width: 1000,
          legend: { position: 'bottom' }
        };

        var data = new google.visualization.DataTable();
        let trends = tracking;
        console.log('Trends web: ' + tracking);
        $.ajax({
          url: server + encodeURIComponent(tracking),
          dataType: 'json'
          }).done(function (results) {
            console.log(results);
            data.addColumn('datetime', 'Time');
            $.each(results, function (i, row) {
              data.addColumn('number', row.tag);
            });
          })
          .fail(function (error) {
            console.log(error);
          });
        var formatDate = new google.visualization.DateFormat({pattern: 'hh:mm:ss'});
        var formatNumber = new google.visualization.NumberFormat({pattern: '#,##0.0'});
        getData();
        setInterval(getData, 3000);
        function getData() {
          $.ajax({
            url: server + encodeURIComponent(tracking),
            dataType: 'json'
            }).done(function (results) {
              console.log(results);
              drawChart(results);
            })
            .fail(function (error) {
              console.log(error);
            });
          }
        function drawChart(results) {
          let timeStamp = new Date();
          let magicdata = [timeStamp];
          $.each(results, function (i, row) {
              magicdata.push(row.sentiment)
              console.log(magicdata);
          })
          data.addRow(magicdata);
          formatDate.format(data, 0);
          chart.draw(data, options);
        }
      },
      packages:['corechart']
    });
  } else {
    console.log("We don't have tags")
  }