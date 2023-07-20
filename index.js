const { v4: uuidv4 } = require('uuid');
const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 3003;
const app = express();
const data = require('./data/data');
const checkID = (type) => {
  return (id) => data[0][type].find(item => item.id === id)
}

const outfitExists = checkID('outfits')
const pieceExists = checkID('pieces')

app.locals = {
  title: 'Data',
  data,
}

app.use(cors());
app.use(express.json());

app.get('/api/v1/data/closet/', (req, res) => {
  const { data } = app.locals;
  const closetData = data[0].pieces;

  res.status(200).json({ closetData });
});

app.get('/api/v1/data/closet/:userID/:category', (req, res) => {
  const { data } = app.locals;
  const { category, userID }  = req.params;
  const closetData = data.filter(user => user.userID === userID )
  const filteredPieces = closetData[0].pieces.filter(piece => piece.categoryID === `CAT-${category}`)

  res.status(200).json({ filteredPieces })
});

app.get('/api/v1/data/outfits/:userID', (req, res) => {
  const { data } = app.locals;
  const { userID } = req.params;
  const user = data.find(user => user.userID === userID)
  const outfitData = user.outfits
  // console.log(outfitData)
  const allData = outfitData.map(outfit => {
    
    const foundOTP = user.outfitToPieces.filter(piece => piece.outfitID === outfit.id)
    const outfitPieces = foundOTP.reduce((arr, piece) => {
      const foundPieces = user.pieces.find(item => item.id === piece.pieceID)
        arr.push(foundPieces)
      return arr
    },[])
    return { outfit, outfitPieces }
  })

  res.status(200).json({ allData });
});

app.get('/api/v1/data/outfits/:userID/:outfitID', (req, res) => {
  const { data } = app.locals;
  const {userID, outfitID} = req.params;

  const user = data.find(user => user.userID === userID)

  const foundOTP = user.outfitToPieces.filter(piece => piece.outfitID === outfitID)
  const outfitPieces = foundOTP.reduce((arr, piece) => {
    const foundPieces = user.pieces.find(item => item.id === piece.pieceID)
      arr.push(foundPieces)
    return arr
  },[])
 
  res.status(200).json({outfitPieces});
});

// send back this info based on ID of outfit and userID to the FE:
// {
//   outfitID: "OUT-klafj",
//   fullOutfitImage: "",
//   notes: "",
//   pieces: [
//     {
//       id: "PIE-",
//       etc,
//     }
//   ]
// }


app.post('/api/v1/data/closet', (req, res) => {
  const { image, categoryID, id, notes } = req.body;
  const requiredProperties = ['image', 'categoryID', 'id'];

  for (let requiredParameter of requiredProperties) {
    if (req.body[requiredParameter] === undefined) {
      return res.status(422).json({
        message: `You are missing a required parameter of ${requiredParameter}`
      });
    }
  }

  if (!app.locals.data[0].pieces.some(piece => piece.id === id)) {
    app.locals.data[0].pieces.push({ id, image, categoryID, notes })
    res.status(201).json({
      message: `${id} Item added!`,
      newData: {
        id,
        image,
        categoryID,
        notes,
      }
    });
  }
  console.log(newData)
})

app.post('/api/v1/data/user', (req, res) => {
  const { data } = app.locals;
  const { username, password } = req.body;
  console.log(username, password)

  const credentialsFound = data.filter(user => {
    return user.credentials.username === username && user.credentials.password === password
  })
  
  if(credentialsFound.length > 0) {
    res.status(201).json({credentialsFound});
  } else {
    res.status(422).json({message: 'Error: Incorrect username or password!'})
  }
})

app.post('/api/v1/data/outfits', (req, res) => {
  const {id, fullOutfitImage, notes} = req.body
  const {data} = app.locals

  if(outfitExists(id)) {
    res.status(400).json({
      message: `Error: Outfit already exists!`
    })
  }
  
  data[0].outfits.push({id, fullOutfitImage, notes})
  
  res.status(201).json({
    message: `${id} Outfit added!`,
    newData: {id, fullOutfitImage, notes}
  })
  
})

app.post('/api/v1/data/outfit-to-pieces', (req, res) => {
  const {outfitID, pieceID} = req.body
  const {data} = app.locals
  const otpID = uuidv4()

  if(!pieceExists(pieceID)) {
    return res.status(404).json({
      message: 'Error: Piece not found!'
    })
  }

  if(!outfitExists(outfitID)) {
    res.status(404).json({
      message: 'Error: Outfit not found!'
    })
  }

  data[0].outfitToPieces.push({id: `OTP-${otpID}`, outfitID, pieceID})
  res.status(201).json({
    message: `OTP-${otpID} Outfit to piece relationship added!`,
    newData: {id:`OTP-${otpID}`, outfitID, pieceID}
  })
})

app.patch('/api/v1/data/outfit/:id', (req,res) => {
  const { id } = req.params;
  const { fullOutfitImage, notes } = req.body
  const { data } = app.locals;

  if(!outfitExists(id)) {
    res.status(404).json({
      message: 'Error: Outfit not found!'
    })
  }

  const foundOutfit = data[0].outfits.find(outfit => outfit.id === id)
  foundOutfit.fullOutfitImage = fullOutfitImage
  foundOutfit.notes = notes

  res.status(201).json({
    message: 'Success! Full outfit image updated.', 
    newData: {id, fullOutfitImage}
  })

})

app.delete('/api/v1/data/outfit-to-pieces', (req, res) => {
  const {outfitID, pieceID} = req.body
  const {data} = app.locals

  const foundOutfitToPiece = data[0].outfitToPieces.find(combo => 
    combo.outfitID === outfitID && combo.pieceID === pieceID
  )

  if(!foundOutfitToPiece) {
    res.status(404).json({
      message: 'Error: Outfit to piece not found! Relationship nonexistant'
    })
  }

  data[0].outfitToPieces.splice(data[0].outfitToPieces.indexOf(foundOutfitToPiece), 1)

  res.status(201).json({
    message: `Success! Piece ${pieceID} removed from outfit ${outfitID}`,
    newData: data[0].outfitToPieces.filter(combo => combo.outfitID === outfitID)
  })
})

app.listen(port, () => {
  console.log(`${app.locals.title} is now running on http://localhost:${port} !`)
});