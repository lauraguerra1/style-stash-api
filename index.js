require('dotenv').config()
const { v4: uuidv4 } = require('uuid');
const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 3003;
const app = express();
const environment = process.env.NODE_ENV || 'development';
const configuration = require('./knexfile')[environment];
const database = require('knex')(configuration);
app.locals = { title: 'Data' }

//MIDDLEWARE
app.use(cors());
app.use(express.json());


// GET ENDPOINTS
app.get('/api/v1/data/closet/:userID', async (req, res) => {
  const { userID } = req.params;
  try {
    const closetData = await database('piece').select().where('user_id', userID)
    res.status(200).json({ closetData });
  } catch (error) {
    res.status(500).json({ error })
  }
});

app.get('/api/v1/data/closet/:userID/:category', async (req, res) => {
  const { category, userID } = req.params;
  try {
    const filteredPieces = await database('piece').select().where('user_id', userID).where('category_id', `CAT-${category}`)
    res.status(200).json({ filteredPieces });
  } catch (error) {
    res.status(500).json({ error })
  }
})

app.get('/api/v1/data/outfits/:userID', async (req, res) => {
  const { userID } = req.params;
  try {
    const pieces = await database('piece').select().where('user_id', userID)
    const outfitData = await database('outfit').select().where('user_id', userID)

    const fullOutfits = await Promise.all(outfitData.map(async (outfit) => {
      const otps = await database('outfit_to_piece').select().where('outfit_id', outfit.id)
      const fitPieces = otps.flat().filter(outToPie => outToPie.outfit_id === outfit.id).map((pie) => {
        const dbPiece = pieces.find(p => pie.piece_id === p.id)
        return {id: dbPiece.id, notes: dbPiece.note, image: dbPiece.image, categoryID: dbPiece.category_id}
      })
      const fullFit = {  id: outfit.id, fullOutfitImage: outfit.image, notes: outfit.note, pieces: fitPieces }
      return fullFit
    }))

    res.status(200).json({ allData: fullOutfits });
  } catch (error) {
    res.status(500).json({ error })
  }
});

app.get('/api/v1/data/outfit/:outfitID', async (req, res) => {
  const { outfitID } = req.params;
  try {
    const outfitData = await database('outfit').select().where('id', outfitID)
    
    const otps = await Promise.all(outfitData.map(async (outfit) => await database('outfit_to_piece').select().where('outfit_id', outfit.id)))
    const pieces = await Promise.all(otps[0].map(async (otp) => {
      const dbPiece = await database('piece').select().where('id', otp.piece_id)
      return {id: dbPiece[0].id, notes: dbPiece[0].note, image: dbPiece[0].image, categoryID: dbPiece[0].category_id}
    }))
    res.status(200).json({ "outfitData": {id: outfitData[0].id, fullOutfitImage: outfitData[0].image, notes: outfitData[0].note}, "outfitPieces": pieces.flat() });
  } catch (error) {
    res.status(500).json({ error })
  }
});

app.get('/api/v1/data/outfit-piece-amount/:pieceID', async (req, res) => {
  const { pieceID } = req.params;
  try {
    const otps = await database('outfit_to_piece').select().where('piece_id', pieceID)
    res.status(201).json({
      data: otps
    })
  } catch (error) {
    res.status(500).json({ error })
  }
})

// // POST ENDPOINTS
app.post('/api/v1/data/closet/', async (req, res) => {
  const { image, categoryID, id, notes, userID } = req.body;
  try {
    await database('piece').insert({
      id,
      image,
      user_id: userID,
      category_id: categoryID,
      note: notes
    })

    res.status(201).json({
      message: `${id} Item added!`,
      newData: {
        id,
        image,
        category_id: categoryID,
        notes,
        user_id: userID
      }
    });
  } catch (error) {
    res.status(500).json({ error })
  }
})

app.post('/api/v1/data/user', async (req, res) => {
  const { username, password } = req.body;
  try {
    const credentialsFound = await database('user').select().where('username', username).where('password', password)
    if(credentialsFound.length > 0) {
      res.status(201).json({credentialsFound});
    } else {
      res.status(422).json({message: 'Error: Incorrect username or password!'})
    }
  } catch (error) {
    res.status(500).json({error})
  }
})

app.post('/api/v1/data/outfits/:userID', async (req, res) => {
  const { userID } = req.params
  const { id, fullOutfitImage, notes } = req.body
  try {
    await database('outfit').insert({ id, user_id: userID, image: fullOutfitImage, note: notes })
    res.status(201).json({
      message: `${id} Outfit added!`,
      newData: { id, fullOutfitImage, notes }
    })
  } catch (error) {
    res.status(500).json({ error })
  }
})

app.post('/api/v1/data/outfit-to-pieces', async (req, res) => {
  const {outfitID, pieceID} = req.body
  const otpID = uuidv4()
  try {
    const newOtp = await database('outfit_to_piece').insert({ id: `OTP-${otpID}`, outfit_id: outfitID, piece_id: pieceID }).returning('*')
    res.status(201).json({
      message: `OTP-${otpID} Outfit to piece relationship added!`,
      newData: { id: newOtp[0].id, outfitID: newOtp[0].outfit_id, pieceID: newOtp[0].piece_id }
    })
  } catch (error) {
    res.status(500).json({error})
  }
})

// //PATCH ENDPOINTS
app.patch('/api/v1/data/closet/:pieceID',async(req, res) => {
  const {pieceID} = req.params;
  const {notes, image} = req.body;

  try {
    await database('piece').select().where('id', pieceID).update({note: notes, image: image})
    const piece = await database('piece').select().where('id', pieceID)

    res.status(201).json({
      message: `Success! Piece # ${pieceID} edited!`,
      newData: piece[0]
    })
  } catch (error) {
    res.status(500).json({ error })
  }
})

app.patch('/api/v1/data/outfit/:outfitID', async(req,res) => {
  const { outfitID } = req.params;
  const { fullOutfitImage, notes } = req.body

  try {
    const patchedOutfit = await database('outfit').where('id', outfitID).update({image: fullOutfitImage, note: notes}, ['image', 'note'])
    res.status(201).json({
      message: 'Success! Full outfit image and notes updated.', 
      newData: { outfitID: outfitID, fullOutfitImage: patchedOutfit[0].image, notes: patchedOutfit[0].note}
    })
  } catch (error) {
    res.status(500).json({error})
  }
})

// //DELETE ENDPOINTS

app.delete('/api/v1/data/outfit-to-pieces', async (req, res) => {
  const { outfitID, pieceID } = req.body

  try {
    await database('outfit_to_piece').select().where('piece_id', pieceID).where('outfit_id', outfitID).del()
    res.status(201).json({
      message: `Success! Piece ${pieceID} removed from outfit ${outfitID}`,
    })
  } catch (error) {
    res.status(500).json({ error })
  }
})

app.delete('/api/v1/data/outfits', async(req, res) => {
  const { id } = req.body

  try {
    await database('outfit_to_piece').select().where('outfit_id', id).del()
    await database('outfit').select().where('id', id).del()
    res.status(201).json({
      message: `${id} Outfit deleted!`
    })
  } catch (error) {
    res.status(500).json({ error })
  }
});

app.delete('/api/v1/data/piece', async (req, res) => {
  const {id} = req.body;

  try {
    await database('outfit_to_piece').select().where('piece_id', id).del()
    await database('piece').where('id', id).del()
    res.status(201).json({
      message: `${id} Piece deleted!`
    })
  } catch (error) {
    res.status(500).json({error})
  }
})

app.listen(port, () => {
  console.log(`${app.locals.title} is now running on http://localhost:${port} !`)
});