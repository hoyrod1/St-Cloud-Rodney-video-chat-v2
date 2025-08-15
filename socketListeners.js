//=================================================================================//
// Once connection has been made create button for all available offers //
socket.on("availableOffers", (availOffers) => {
  // console.log(availOffers);
  createOfferEls(availOffers);
});
//=================================================================================//

//=================================================================================//
// When a new connection has been made create button //
socket.on("newOfferAwaiting", (offersWaiting) => {
  // console.log(offersWaiting);
  createOfferEls(offersWaiting);
});
//=================================================================================//

//=================================================================================//
// when a answer has been emitted
socket.on("answerResponse", (offerObj) => {
  // console.log(offerObj);
  addAnswer(offerObj);
});
//=================================================================================//

//=================================================================================//
// createOfferEls creates avaiable button elements depending on "offers available"
function createOfferEls(offers) {
  const answerEl = document.querySelector("#answer");

  offers.forEach((offer) => {
    // console.log(offer);
    const newOfferDivEl = document.createElement("div");
    newOfferDivEl.innerHTML = `<button style="width:25%;margin:3px;" class="btn btn-success col-1">Answer ${offer.offererUserName}</button>`;
    newOfferDivEl.addEventListener("click", () => answerOffer(offer));
    answerEl.appendChild(newOfferDivEl);
  });
}
//=================================================================================//
