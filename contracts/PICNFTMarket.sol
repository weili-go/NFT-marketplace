// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.4;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";


contract PICNFTMarket is ReentrancyGuard {
  using Counters for Counters.Counter;
  Counters.Counter private _itemIds;
  Counters.Counter public _itemsSold;

  address payable owner;
  uint256 public listingPrice = 0.01 ether;

  constructor() {
    owner = payable(msg.sender);
  }

  enum SaleKind { Fix, Auction }

  struct MarketItem {
    uint256 itemId;
    address nftContract;
    uint256 tokenId;
    address payable seller;
    address payable owner;
    uint256 price;
    uint256 reserved;
    uint256 listTime;
    uint256 duration;
    SaleKind salekind;
  }

  struct Bid {
      uint256 bidTime;
      address bidder;
      uint256 value;
  }

  mapping(uint256 => MarketItem) private idToMarketItem;
  mapping (uint256 => Bid) public bids;
  //Bid sucessBid;

  event MarketItemCreated (
    uint256 indexed itemId,
    address indexed nftContract,
    uint256 indexed tokenId,
    address seller,
    address owner,
    uint256 price,
    uint256 reserved,
    uint256 listTime,
    uint256 duration,
    SaleKind salekind
  );

  event MarketItemSold (
    address indexed nftContract,
    uint256 indexed tokenId,
    address seller,
    address buyer,
    uint256 price
  );

  function setListingPrice(uint256 newListingPrice) public {
    require(msg.sender == owner, "not owner");
    listingPrice = newListingPrice;
  }

  function withdrawETH(address wallet) public {
    require(msg.sender == owner, "not owner");
    payable(wallet).transfer(address(this).balance);
  }

  function getNftInfobyMarketItemId(uint256 marketItemId) public view returns (MarketItem memory) {
    return idToMarketItem[marketItemId];
  }

  function sellNFTInMarket(
    address nftContract,
    uint256 tokenId,
    SaleKind salekind,
    uint256 price,
    uint256 reserved,
    uint256 duration
  ) public payable nonReentrant {
    require(price > 0, "price needed");
    require(reserved == 0 || reserved > price, "reserved must be here when auction");
    require(msg.value == listingPrice, "listing price needed");
    require(IERC721(nftContract).ownerOf(tokenId) == msg.sender, "not owner of the token");

    _itemIds.increment();

    uint256 reservedtmp = salekind==SaleKind.Fix? price:reserved;
    uint256 listTime = block.timestamp;
    idToMarketItem[_itemIds.current()] =  MarketItem(
      _itemIds.current(),
      nftContract,
      tokenId,
      payable(msg.sender),
      payable(address(0)),
      price,
      reservedtmp,
      listTime,
      duration,
      salekind
    );

    //deposit NFT
    IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);

    emit MarketItemCreated(
      _itemIds.current(),
      nftContract,
      tokenId,
      msg.sender,
      address(0),
      price,
      reservedtmp,
      listTime,
      duration,
      salekind
    );
  }

  function resellNFTInMarket(
    uint256 itemId,
    address nftContract,
    uint256 tokenId,
    SaleKind salekind,
    uint256 price,
    uint256 reserved,
    uint256 duration
  ) public nonReentrant {

    require(price > 0, "price needed");
    require(reserved == 0 || reserved > price, "Price must be at least 1 wei");
    require(idToMarketItem[itemId].nftContract == nftContract, "contract not match");
    require(idToMarketItem[itemId].tokenId == tokenId, "contract not match");

    require(nftContract != address(0), "no such item");
    //require(endtime <= block.timestamp, "can not resale by end time");
    require(IERC721(nftContract).ownerOf(tokenId) == address(this), "Not deposited yet");
    require(idToMarketItem[itemId].owner == msg.sender || (idToMarketItem[itemId].owner == address(0) && idToMarketItem[itemId].seller == msg.sender), "can not sell by sender");

    //_itemIds.increment();
    //uint256 itemId = _itemIds.current();
    uint256 reservedtmp = salekind==SaleKind.Fix? price:reserved;
    uint256 listTime = block.timestamp;
    idToMarketItem[itemId] =  MarketItem(
      itemId,
      nftContract,
      tokenId,
      payable(msg.sender),
      payable(address(0)),
      price,
      reservedtmp,
      listTime,
      duration,
      salekind
    );

    //IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);
    // no need save
    delete bids[itemId];

    emit MarketItemCreated(
      itemId,
      nftContract,
      tokenId,
      msg.sender,
      address(0),
      price,
      reservedtmp,
      listTime,
      duration,
      salekind
    );
  }

  function buyNftbyMarketItemId(
    uint256 itemId
  ) public payable nonReentrant {
    uint256 price = idToMarketItem[itemId].price;
    uint256 tokenId = idToMarketItem[itemId].tokenId;
    address nftContract = idToMarketItem[itemId].nftContract;
    uint256 endtime = idToMarketItem[itemId].listTime + idToMarketItem[itemId].duration * 60;
    uint256 reserved = idToMarketItem[itemId].reserved;

    require(nftContract != address(0), "no such item");
    require(block.timestamp >= idToMarketItem[itemId].listTime, "sale not yet start");
    require(idToMarketItem[itemId].owner == address(0), "had sold");

    if(SaleKind.Fix == idToMarketItem[itemId].salekind){
      require(msg.value >= price, "price not right");
      require(block.timestamp < endtime , "sale had ended");
      idToMarketItem[itemId].seller.transfer(price);
      if(msg.value-price > 0){
        payable(msg.sender).transfer(msg.value-price);
      }
      //IERC721(nftContract).transferFrom(address(this), msg.sender, tokenId);
      idToMarketItem[itemId].owner = payable(msg.sender);
      _itemsSold.increment();
      emit MarketItemSold(
        nftContract,
        tokenId,
        idToMarketItem[itemId].seller,
        idToMarketItem[itemId].owner,
        price
      );
    }else{
      if(block.timestamp < endtime){
        require(msg.value >= price, "price not right");
        if(bids[itemId].value != 0){
          //return value
          require(msg.value > bids[itemId].value , "below bid price");
          payable(bids[itemId].bidder).transfer(bids[itemId].value);
        }

        bids[itemId] = Bid(block.timestamp, msg.sender, msg.value);

        if(reserved != 0 && msg.value >= reserved){
          idToMarketItem[itemId].seller.transfer(reserved);
          idToMarketItem[itemId].owner = payable(msg.sender);
          _itemsSold.increment();
          emit MarketItemSold(
            nftContract,
            tokenId,
            idToMarketItem[itemId].seller,
            idToMarketItem[itemId].owner,
            msg.value
          );
          //delete bids[itemId];
          //return;
          if(msg.value-reserved > 0){
            payable(msg.sender).transfer(msg.value-reserved);
          }
          bids[itemId] = Bid(block.timestamp, msg.sender, reserved);
        }

      }else{
        if(bids[itemId].value != 0){
          idToMarketItem[itemId].seller.transfer(bids[itemId].value);
          idToMarketItem[itemId].owner = payable(bids[itemId].bidder);
          _itemsSold.increment();
          emit MarketItemSold(
            nftContract,
            tokenId,
            idToMarketItem[itemId].seller,
            idToMarketItem[itemId].owner,
            bids[itemId].value
          );
        }
        //no need eth for withdraw
        if(msg.value > 0){
          payable(msg.sender).transfer(msg.value);
        }
      }
    }
  }

  function withdawNFTFromMarket(
    uint256 itemId
  ) public nonReentrant {
    address iowner = idToMarketItem[itemId].owner;
    uint256 endtime = idToMarketItem[itemId].listTime + idToMarketItem[itemId].duration * 60;
    uint256 tokenId = idToMarketItem[itemId].tokenId;
    address nftContract = idToMarketItem[itemId].nftContract;
    address seller = idToMarketItem[itemId].seller;

    require(nftContract != address(0), "no such item");
    if(iowner == address(0) && seller == msg.sender){
      require(endtime <= block.timestamp, "can not withdraw by end time");
    }

    require(iowner == msg.sender || (iowner == address(0) && seller == msg.sender), "can not withdraw");
    IERC721(nftContract).transferFrom(address(this), msg.sender, tokenId);
    delete idToMarketItem[itemId];
    delete bids[itemId];
  }

  function fetchMarketItem(uint256 itemId) public view returns (MarketItem memory) {
    MarketItem memory item = idToMarketItem[itemId];
    return item;
  }

  function fetchAllNftsLockedInMarket() public view returns (MarketItem[] memory) {
    uint256 itemCount = _itemIds.current();
    uint256 unsoldItemCount = 0;
    for (uint256 i = 0; i < itemCount; i++) {
      if (idToMarketItem[i + 1].owner == address(0) && idToMarketItem[i + 1].nftContract != address(0)) {
        unsoldItemCount+=1;
      }
    }

    uint256 currentIndex = 0;

    MarketItem[] memory items = new MarketItem[](unsoldItemCount);
    for (uint256 i = 0; i < itemCount; i++) {
      if (idToMarketItem[i + 1].owner == address(0) && idToMarketItem[i + 1].nftContract != address(0)) {
        uint256 currentId = idToMarketItem[i + 1].itemId;
        MarketItem storage currentItem = idToMarketItem[currentId];
        items[currentIndex] = currentItem;
        currentIndex += 1;
      }
    }
   
    return items;
  }

  function fetchMyNFTsLockedInMarket() public view returns (MarketItem[] memory) {
    uint256 totalItemCount = _itemIds.current();
    uint256 itemCount = 0;
    uint256 currentIndex = 0;

    for (uint256 i = 0; i < totalItemCount; i++) {
      if (idToMarketItem[i + 1].owner == msg.sender) {
        itemCount += 1;
      }
    }

    MarketItem[] memory items = new MarketItem[](itemCount);
    for (uint256 i = 0; i < totalItemCount; i++) {
      if (idToMarketItem[i + 1].owner == msg.sender) {
        uint256 currentId = idToMarketItem[i + 1].itemId;
        MarketItem storage currentItem = idToMarketItem[currentId];
        items[currentIndex] = currentItem;
        currentIndex += 1;
      }
    }
   
    return items;
  }
}