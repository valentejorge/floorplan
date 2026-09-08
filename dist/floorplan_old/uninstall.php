<?php
$query = "
DROP TABLE IF EXISTS `plugin_floorplan_objects`;
DROP TABLE IF EXISTS `plugin_floorplan_rooms`;
DROP TABLE IF EXISTS `plugin_floorplan_floors`;
DROP TABLE IF EXISTS `plugin_floorplan_buildings`;
";

mysqli_multi_query($_SESSION['APP_DB_LINK'], $query);
while (mysqli_more_results($_SESSION['APP_DB_LINK'])) {
    mysqli_next_result($_SESSION['APP_DB_LINK']);
}
?>
