let accessToken;

$(() => {
  console.log("Hello world");

  let accessTokenObj = localStorage.getItem("accessToken");
  if(!accessTokenObj && window.location.hostname !== "localhost") {
    return window.location.replace("/login");
  }
  accessToken = JSON.parse(accessTokenObj);

  console.log("User is logged in!", accessToken);

  $.ajaxSetup({
    headers: {
      Authorization: `Bearer ${accessToken.access_token}`
    }
  });

  // let $emailInput = $("#inputEmail");
  // let $passwordInput = $("#inputPassword");
  // Authorization: Bearer aXJUKynsTUXLVY
  $.ajax({
    type: "GET",
    url: "/yahoo"
  }).done((data) => {
    console.log("/yahoo API call result:", data);
  });

  // $("#login").on("click", (e) => {
  //   let email = $emailInput.val();
  //   let password = $passwordInput.val();
  //   $.ajax({
  //     type: "POST",
  //     url: "/login",
  //     data: {
  //       email: email,
  //       password: password
  //     }
  //   }).done((data) => {
  //     console.log("POST response:", data);
  //   });
  // });
});
